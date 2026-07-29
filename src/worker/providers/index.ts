import type { TryOnProvider } from './types';
import { mockProvider } from './mock';

const registry: Record<string, TryOnProvider> = {
  mock: mockProvider,
  // workersai: 마일스톤5에서 추가 (flux-2-klein-4b)
  // gemini: 마일스톤9에서 추가 (유료, 기본 비활성)
};

export function getTryOnProvider(env: Env): TryOnProvider {
  const provider = registry[env.TRYON_PROVIDER];
  if (!provider) {
    throw new Error(`Unknown TRYON_PROVIDER: ${env.TRYON_PROVIDER}`);
  }
  return provider;
}
