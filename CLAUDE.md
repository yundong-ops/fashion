# 핏메이트 (FitMate)

패션을 잘 모르는 2030 남성을 위한 AI 가상 피팅 스타일 추천 웹. 상세 설계는
`.claude/plans/` 또는 대화 히스토리의 최종 계획 문서를 참고. 요약:
키·몸무게 + 사진 4장 → 체형/톤 분석 → 어울리는 상의·하의 추천 → 유저 사진에
AI로 입혀서 보여줌 → 옷 클릭 시 상세정보 + 유사상품 5개 → 유사상품 클릭 시
재생성.

## Git — 자동 푸시

이 프로젝트는 `https://github.com/yundong-ops/fashion` 에 자동 푸시한다.
**의미 있는 작업 단위(마일스톤, 기능, 버그 수정)가 끝날 때마다 별도 요청 없이
서술적 커밋 메시지로 커밋하고 `main`에 `git push` 한다.**

## 배포 — 자동 배포

Cloudflare 계정 ID `0c031e9a0d4ee8e3b87ba4df5f923e22`.
`https://dash.cloudflare.com/0c031e9a0d4ee8e3b87ba4df5f923e22/pages/view/fashion`
은 Cloudflare **Pages** 프로젝트(`fashion`) 대시보드 링크이지만, 이 저장소는
**Workers** 구성(`wrangler.jsonc`: `name: fitmate`, 정적에셋 바인딩 + Hono
API)을 그대로 유지하기로 결정했다(2026-07-29). 따라서 배포는
`npm run deploy`(= `wrangler deploy`)로 하며, 결과물은 위 Pages URL이 아니라
Cloudflare 대시보드의 **Workers & Pages → `fitmate`** 항목에 나타난다.
**의미 있는 작업 단위(마일스톤, 기능, 버그 수정)가 끝날 때마다 별도 요청
없이 `npm run deploy`까지 진행한다.** `wrangler`는 `CLOUDFLARE_API_TOKEN`
환경변수 또는 `wrangler login`으로 인증되어 있어야 한다.

## 핵심 제약 (위반하면 안 되는 것들)

1. **카탈로그는 100% 더미 데이터.** 무신사·29CM는 공개 상품 API가 없다
   (확인 완료). 실제 스크래핑 금지. 유튜버(전현표입니다·깡스타일리스트 등)
   스타일은 참고만 하고, 실명·실제 상품 링크는 절대 노출하지 않는다
   (초상권/저작권 리스크).
2. **Worker CPU 10ms 예산.** 요청 본문의 base64/멀티MB 페이로드를 Worker에서
   파싱·조작하지 않는다. `multipart/form-data`로 받아 `Blob`을 그대로
   통과시킨다.
3. **얼굴 사진은 서버에 저장하지 않는다.** KV·R2·D1 바인딩을 추가하지 않는다
   (의도적 부재). 로그에 이미지 바이트·base64·data URI를 남기지 않는다.
   모든 `/api/*` 응답에 `Cache-Control: no-store`.
4. **캐시는 클라이언트 IndexedDB 전용** (`src/client/lib/tryonCache.ts`).
   키: `SHA-256(person photo)[:16] + topId + bottomId`.
5. **피팅 프로바이더는 어댑터 패턴 뒤에 둔다** (`src/worker/providers/`).
   기본값은 `mock`(마일스톤1). `workersai`(flux-2-klein-4b, 마일스톤5)는
   `wrangler.jsonc`에 `ai` 바인딩을 다시 추가해야 동작한다 — 로컬
   `vite dev`에서 `ai` 바인딩이 선언되면 실제 Cloudflare 계정 원격 프록시
   (`CLOUDFLARE_API_TOKEN`)가 필요해지므로, mock만 쓰는 동안은 바인딩을
   주석 처리해둔다.
6. **무료 티어를 영구적이라 가정하지 않는다.** Gemini 이미지 모델은
   2025-12부터 무료 티어가 없다(2026-07 기준). 체형 분석용
   `gemini-2.5-flash`(텍스트·비전)는 무료. 피팅 생성은 Cloudflare Workers AI
   `flux-2-klein-4b`(10,000 뉴런/일 무료)를 기본으로 한다.

## 로컬 개발

```
npm install
npm run dev      # vite dev — @cloudflare/vite-plugin이 워커+정적에셋 통합 서빙
npm run typecheck
```

- `vite.config.ts`의 `cloudflare({ configPath: '../../wrangler.jsonc' })`는
  필수다 — `root: 'src/client'`라서 플러그인이 기본 위치에서
  `wrangler.jsonc`를 못 찾는다.
- `npm install` 시 `workerd`/`esbuild`/`sharp`의 postinstall 스크립트가
  allow-scripts 정책으로 막힐 수 있다. 막히면 `npm approve-scripts --all` 후
  `npm install`을 다시 실행해야 실제 `workerd.exe` 바이너리가 설치된다
  (승인 전에는 5KB짜리 JS 셔임만 있어서 `EFAULT` 소켓 에러가 난다).
- Workers AI 응답을 만드는 `new Response(new Blob([...]))` 호출부에서
  `Uint8Array<ArrayBufferLike>` → `BlobPart` 캐스팅이 필요하다 (TS5.7 lib.dom
  제네릭 타입 이슈, `src/worker/routes/tryon.ts` 참고).

## 디렉터리

- `src/shared/` — worker·client 공용 순수 함수/타입 (catalog, sizing,
  recommend). 네트워크 없이 단위 테스트 가능하게 유지한다.
- `src/worker/` — Hono API (`/api/analyze`, `/api/tryon`) + 피팅 프로바이더
  어댑터.
- `src/client/` — React SPA. 화면은 `screens/`, 재사용 컴포넌트는
  `components/`, 순수 유틸은 `lib/`.
- `public/catalog/` — 카탈로그 이미지. 마일스톤1은 SVG 플레이스홀더,
  마일스톤3에서 실제 생성 이미지(webp)로 교체 예정.

## 디자인

Apple 스타일 — `src/client/styles.css`의 CSS 변수(`--accent`, `--radius-*`,
`--shadow-*`)로 통일. 라이트/다크 모두 `prefers-color-scheme`로 대응.
