import { Hono } from 'hono';
import { getTryOnProvider } from '../providers';

export const tryonRoute = new Hono<{ Bindings: Env }>();

tryonRoute.post('/', async (c) => {
  const form = await c.req.formData();
  const person = form.get('person');
  const face = form.get('face');
  const top = form.get('top');
  const bottom = form.get('bottom');
  const topDescription = String(form.get('topDescription') ?? '');
  const bottomDescription = String(form.get('bottomDescription') ?? '');

  if (
    !(person instanceof File) ||
    !(face instanceof File) ||
    !(top instanceof File) ||
    !(bottom instanceof File)
  ) {
    return c.json({ error: 'person, face, top, bottom images are required' }, 400);
  }

  const provider = getTryOnProvider(c.env);
  const result = await provider.generate(
    { person, face, top, bottom, topDescription, bottomDescription },
    c.env,
  );

  // TS5.7 lib.dom's generic Uint8Array<ArrayBufferLike> doesn't structurally satisfy BlobPart.
  return new Response(new Blob([result.image as unknown as ArrayBuffer]), {
    headers: {
      'Content-Type': result.mimeType,
      'Cache-Control': 'no-store',
      'X-TryOn-Provider': result.providerId,
      'X-TryOn-Latency-Ms': String(result.latencyMs),
    },
  });
});
