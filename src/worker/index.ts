import { Hono } from 'hono';
import { analyzeRoute } from './routes/analyze';
import { tryonRoute } from './routes/tryon';

const app = new Hono<{ Bindings: Env }>();

app.use('/api/*', async (c, next) => {
  await next();
  c.res.headers.set('Cache-Control', 'no-store');
});

app.route('/api/analyze', analyzeRoute);
app.route('/api/tryon', tryonRoute);

app.get('*', (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
