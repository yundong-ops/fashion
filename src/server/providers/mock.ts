import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { TryOnInput, TryOnProvider, TryOnResult } from './types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLACEHOLDER_PATH = path.resolve(__dirname, '../../../public/tryon-placeholder.svg');

/** 네트워크 호출 없이 UX 전체를 검증하기 위한 개발용 프로바이더. */
export const mockProvider: TryOnProvider = {
  id: 'mock',

  async generate(_input: TryOnInput): Promise<TryOnResult> {
    const start = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 800));

    const image = await readFile(PLACEHOLDER_PATH);

    return {
      image,
      mimeType: 'image/svg+xml',
      providerId: 'mock',
      latencyMs: Date.now() - start,
    };
  },
};
