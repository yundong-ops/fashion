import { Hono } from 'hono';
import { getTryOnProvider } from '../providers';
import { applyMoodPostprocess } from '../postprocess/mood';
import type { ServerEnv } from '../env';

export function createTryonRoute(env: ServerEnv) {
  const tryonRoute = new Hono();

  tryonRoute.post('/', async (c) => {
    const form = await c.req.formData();
    const person = form.get('person');
    const topGarment = form.get('topGarment');
    const bottomGarment = form.get('bottomGarment');
    const topDescription = String(form.get('topDescription') ?? '');
    const bottomDescription = String(form.get('bottomDescription') ?? '');

    if (!(person instanceof File) || !(topGarment instanceof File) || !(bottomGarment instanceof File)) {
      return c.json({ error: 'person, topGarment, bottomGarment images are required' }, 400);
    }

    const provider = getTryOnProvider(env);
    const start = Date.now();

    if (provider.id === 'mock') {
      const result = await provider.generate({
        person,
        garment: topGarment,
        garmentDescription: topDescription,
        category: 'top',
      });
      return new Response(new Blob([result.image as unknown as ArrayBuffer]), {
        headers: {
          'Content-Type': result.mimeType,
          'Cache-Control': 'no-store',
          'X-TryOn-Provider': result.providerId,
          'X-TryOn-Latency-Ms': String(result.latencyMs),
        },
      });
    }

    try {
      // 실제 IDM-VTON은 옷 하나만 입힐 수 있어 상의 -> 하의 순으로 두 번 체이닝한다.
      const afterTop = await provider.generate({
        person,
        garment: topGarment,
        garmentDescription: topDescription,
        category: 'top',
      });
      const afterBottom = await provider.generate({
        person: new Blob([afterTop.image as unknown as ArrayBuffer], { type: afterTop.mimeType }),
        garment: bottomGarment,
        garmentDescription: bottomDescription,
        category: 'bottom',
      });

      const finalImage = await applyMoodPostprocess(afterBottom.image, afterBottom.mimeType);

      return new Response(new Blob([finalImage as unknown as ArrayBuffer]), {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'no-store',
          'X-TryOn-Provider': afterBottom.providerId,
          'X-TryOn-Latency-Ms': String(Date.now() - start),
        },
      });
    } catch (err) {
      // 이미지 바이트/base64는 절대 로그에 남기지 않는다 (얼굴 사진 보호).
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[tryon] 실패 (${Date.now() - start}ms): ${message}`);

      // 실패 유형별로 유저가 실제로 할 수 있는 행동을 안내한다.
      // ZeroGPU 할당량 소진이 무료 티어에서 가장 흔한 실패 원인이다 (합성 1회당
      // GPU 약 120초 = 상의·하의 2회 호출, 익명 할당량은 하루 몇 분 수준).
      if (/ZeroGPU quota|exceeded your .*quota|GPU quota/i.test(message)) {
        return c.text(
          '무료 AI 서버의 일일 GPU 사용량을 모두 썼어요. 내일 다시 시도하거나, ' +
            'Hugging Face 토큰을 HF_TOKEN 환경변수로 설정하면 할당량이 늘어나요 ' +
            '(huggingface.co/settings/tokens).',
          429,
        );
      }
      // HF Space가 사람을 인식하지 못하면 IndexError 계열 에러를 뱉는다.
      if (/IndexError|list index|NoneType/i.test(message)) {
        return c.text(
          '사진에서 사람을 인식하지 못했어요. 머리부터 발끝까지 정면으로 나온 전신 사진으로 다시 시도해주세요.',
          502,
        );
      }
      if (/시간 초과|timeout/i.test(message)) {
        return c.text(
          '무료 AI 서버가 응답하지 않아요. 대기열이 길 수 있으니 잠시 후 다시 시도해주세요.',
          504,
        );
      }
      return c.text(`AI 서버 오류: ${message.slice(0, 300)}`, 502);
    }
  });

  return tryonRoute;
}
