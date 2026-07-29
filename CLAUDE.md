# 핏메이트 (FitMate)

패션을 잘 모르는 2030 남성을 위한 AI 가상 피팅 스타일 추천 웹. 유저가 상의·하의를
직접 고르면(유사 추천 포함) 전신 사진 한 장으로 체형을 분석하고, 실제로 입은 모습을
합성해서 보여준다.

**2026-07-29에 스택을 전면 전환했다**: Cloudflare Workers + Gemini/Workers AI 조합
(마일스톤1 스켈레톤)을 버리고, **완전 무료 오픈소스 스택 + Node.js 서버**로 재작성.
과거 계획 문서(`.claude/plans/`)는 Cloudflare 버전 기준이라 더 이상 정확하지 않다.

## 유저 플로우

1. 상의 선택 → CLIP 임베딩 기반 유사 추천 상의 노출 (선택 시 그걸로 교체 가능)
2. 하의 선택 (동일하게 유사 추천)
3. 키 / 몸무게 입력
4. 전신 사진 한 장 업로드 (얼굴 포함, 정면)
5. 브라우저에서 MoveNet으로 체형 분석 (실패 시 키/몸무게만으로 폴백)
6. "합성하기" → 서버가 HF Space 호출(상의→하의 순 2회 체이닝) → 배경 제거 + 무드
   보정 후처리 → 결과 이미지 표시
7. 결과 화면에서 옷 클릭 → 상세정보 + 유사상품 → 클릭 시 재합성

## Git — 자동 푸시

이 프로젝트는 `https://github.com/yundong-ops/fashion` 에 자동 푸시한다.
**의미 있는 작업 단위(마일스톤, 기능, 버그 수정)가 끝날 때마다 별도 요청 없이
서술적 커밋 메시지로 커밋하고 `main`에 `git push` 한다.**

## 배포 — Render.com

**Cloudflare는 더 이상 배포 대상이 아니다.** (이전에 시도했던
`dash.cloudflare.com/.../pages/view/fashion` Pages 프로젝트와
`fitmate.s49139178.workers.dev` Workers 배포는 이 스택 전환으로 obsolete —
정리하고 싶으면 Cloudflare 대시보드에서 수동으로 지우면 된다. 코드에는 더 이상
Cloudflare 관련 설정이 없다.)

HF Space 호출(`@gradio/client`), 배경 제거(`@imgly/background-removal-node`),
`sharp` 등은 전부 일반 Node.js 런타임이 필요해 **Render.com Web Service**로
배포한다. `render.yaml` (Blueprint)이 저장소 루트에 있다.

- Build Command: `npm install && npm run build`
- Start Command: `npm start` (`tsx src/server/index.ts` — API + `dist/client` 정적
  서빙을 한 프로세스에서 처리)
- 무료 티어는 일정 시간 요청이 없으면 슬립 → 첫 요청이 느릴 수 있다.
- 계정 생성/GitHub 연결은 Render 대시보드에서 사용자가 직접 해야 한다
  (`New Web Service` → 이 GitHub 레포 선택, 또는 `render.yaml`을 인식하는
  `New Blueprint`). 연결 이후에는 `main` push마다 Render가 자동 재배포한다 —
  Claude가 별도로 배포 명령을 실행할 필요 없음.
- 환경변수: `TRYON_PROVIDER`(`mock` 기본값, 실제 배포는 `hf`), `HF_SPACE`
  (기본 `yisol/IDM-VTON`), 필요 시 `HF_TOKEN`.

## 핵심 제약 (위반하면 안 되는 것들)

1. **카탈로그는 100% 더미 데이터.** `public/catalog/`의 실제 상품 사진(옷1·2,
   바지1·2) + 임의로 붙인 브랜드/가격/사이즈표. 무신사·29CM 실제 스크래핑 금지.
2. **얼굴 사진은 서버에 저장하지 않는다.** DB/파일 영속화 없음 — 업로드된 사진은
   요청 처리 중 메모리에만 존재. 모든 `/api/*` 응답에 `Cache-Control: no-store`.
3. **가상 피팅은 100% 무료 오픈소스 스택.**
   - 체형 분석: `@tensorflow-models/pose-detection` MoveNet, 브라우저에서 실행
     (서버 GPU 불필요). 의료용 정확도가 아니라 사이즈 추천 참고치.
   - 합성: Hugging Face 공개 Space(`yisol/IDM-VTON`, 기본값)를 `@gradio/client`로
     호출. **IDM-VTON은 CC BY-NC-SA 4.0(비상업적 용도 전용)** — 실제 상업 서비스
     전환 시 반드시 재검토(`src/server/providers/hfSpace.ts` 주석 참고).
     공개 데모라 콜드스타트/대기열로 느릴 수 있어 타임아웃+재시도가 붙어있다.
   - 이 Space는 옷 하나만 입힐 수 있어 상의→하의 순으로 두 번 체이닝한다
     (`src/server/routes/tryon.ts`).
   - 유사 상품 추천: CLIP 임베딩(`assets/clothes_embeddings.json`) 코사인 유사도,
     순수 JS 연산(`src/server/routes/similar.ts`) — GPU/외부 호출 없음. 임베딩은
     `npm run embeddings`(로컬 CPU, `@xenova/transformers`)로 생성했고, 카탈로그가
     커지면 `scripts/colab_clip_embeddings.ipynb`를 Colab 무료 GPU에서 돌려 같은
     포맷으로 교체한다.
   - 무드 보정: 합성 결과에서 배경 제거(`@imgly/background-removal-node`, Node
     네이티브 — Python rembg 대체) 후 스튜디오 단색 배경 합성 + `무신사 스냅 1~10`
     레퍼런스(`assets/mood-refs/`) 평균 톤에 30%만 근접시키는 밝기 보정
     (`src/server/postprocess/mood.ts`). 톤 값은 `npm run mood-tone`으로 재계산.
4. **프로바이더는 어댑터 패턴 뒤에 둔다** (`src/server/providers/`). 기본값은
   `mock`(로컬 개발용, 플레이스홀더 SVG). 실제 배포는 `TRYON_PROVIDER=hf`.

## 로컬 개발

```
npm install
npm run dev          # vite(client, :5173) + tsx watch(server, :8787) 동시 실행
npm run typecheck
npm run test
```

- `npm run dev:client` / `npm run dev:server`로 따로 띄울 수도 있음. vite dev
  서버가 `/api/*`를 8787로 프록시한다(`vite.config.ts`).
- `npm run build` → `dist/client/`에 정적 SPA 빌드. `npm start` → 그 정적 파일 +
  API를 한 Node 프로세스로 서빙(`src/server/index.ts`).
- `npm install` 시 `sharp`/`onnxruntime-node` 등 네이티브 바이너리 postinstall이
  allow-scripts 정책으로 막힐 수 있다. 막히면 `npm approve-scripts --all` 후
  `npm install`을 다시 실행. **`sharp`가 두 버전(루트 0.33.x + `@imgly`/`@xenova`
  중첩 의존성 0.32.x)으로 동시에 존재해서 `approve-scripts`가 계속 하나씩만
  승인하며 왔다갔다할 수 있다** — 이럴 땐 `package.json`의 `allowScripts`에
  두 버전을 직접 같이 적어주면 해결된다.
- Windows에서 `sharp`/`libvips` 관련 `GLib-GObject-CRITICAL` 경고가 콘솔에 뜰 수
  있는데 무해하다 (실제 이미지 처리 결과에는 영향 없음, 확인 완료).
- `new Blob([buffer])`처럼 Node `Buffer`를 그대로 넘기면 TS5.7 lib.dom 제네릭
  이슈로 `BlobPart` 타입 에러가 난다 — `buffer as unknown as ArrayBuffer`로
  캐스팅해야 한다 (`src/server/routes/tryon.ts`, `postprocess/mood.ts` 참고).
- `@imgly/background-removal-node`의 `removeBackground()`에 Buffer를 넘길 때도
  `new Blob([buf], { type: 'image/png' })`처럼 **명시적으로 mime type을 지정**해야
  한다 — 안 그러면 `Unsupported format:` 에러가 난다.

## 디렉터리

- `src/shared/` — client·server 공용 순수 함수/타입 (catalog, sizing, recommend).
  네트워크 없이 단위 테스트 가능하게 유지한다.
- `src/server/` — Hono API(`@hono/node-server`) + 정적 파일 서빙 + 피팅 프로바이더
  어댑터 + 후처리.
  - `routes/tryon.ts`, `routes/similar.ts`
  - `providers/{mock,hfSpace}.ts`
  - `postprocess/mood.ts`
- `src/client/` — React SPA. `screens/`(화면), `components/`(재사용 컴포넌트),
  `lib/`(순수 유틸 + MoveNet 연동).
- `public/catalog/{tops,bottoms}/` — 카탈로그 상품 이미지 (실제 사진, 더미 상품
  정보로 포장).
- `assets/` — 빌드 산출물이 아닌 데이터 자산. `clothes_embeddings.json`(CLIP
  임베딩), `mood-refs/`(무신사 스냅 10장 + 계산된 `tone.json`).
- `scripts/` — 오프라인 1회성 스크립트: `computeEmbeddings.mjs`,
  `computeMoodTone.mjs`, `colab_clip_embeddings.ipynb`.

## 디자인

Apple 스타일 — `src/client/styles.css`의 CSS 변수(`--accent`, `--radius-*`,
`--shadow-*`)로 통일. 라이트/다크 모두 `prefers-color-scheme`로 대응.
