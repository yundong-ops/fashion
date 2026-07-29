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
  });

  return tryonRoute;
}
