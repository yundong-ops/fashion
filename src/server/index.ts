import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { loadEnv } from './env';
import { similarRoute } from './routes/similar';
import { createTryonRoute } from './routes/tryon';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(__dirname, '../../dist/client');

const env = loadEnv();
const app = new Hono();

app.use('/api/*', async (c, next) => {
  await next();
  c.res.headers.set('Cache-Control', 'no-store');
});

app.route('/api/similar', similarRoute);
app.route('/api/tryon', createTryonRoute(env));

app.use('/*', serveStatic({ root: CLIENT_DIST }));

app.get('*', async (c) => {
  const html = await readFile(path.join(CLIENT_DIST, 'index.html'), 'utf-8');
  return c.html(html);
});

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`fitmate server listening on http://localhost:${info.port}`);
});
