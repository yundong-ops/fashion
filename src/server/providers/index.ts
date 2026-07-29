import type { TryOnProvider } from './types';
import type { ServerEnv } from '../env';
import { mockProvider } from './mock';
import { createHfSpaceProvider } from './hfSpace';

export function getTryOnProvider(env: ServerEnv): TryOnProvider {
  if (env.tryonProvider === 'mock') return mockProvider;
  if (env.tryonProvider === 'hf') return createHfSpaceProvider(env);
  throw new Error(`Unknown TRYON_PROVIDER: ${env.tryonProvider}`);
}
