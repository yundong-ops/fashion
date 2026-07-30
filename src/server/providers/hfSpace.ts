import { Client, handle_file } from '@gradio/client';
import type { TryOnInput, TryOnProvider, TryOnResult } from './types';
import type { ServerEnv } from '../env';

/**
 * yisol/IDM-VTON 공개 HF Space를 호출하는 프로바이더.
 * 라이선스: IDM-VTON은 CC BY-NC-SA 4.0(비상업적 용도 전용) — 실제 상업 서비스로
 * 전환할 때는 반드시 재검토할 것.
 *
 * 이 Space는 한 번에 옷 하나(상의 또는 하의)만 입힐 수 있어, 상/하의를 모두
 * 합성하려면 두 번 호출해야 한다 (라우트에서 person에 이전 결과를 넘겨 체이닝).
 *
 * 공개 데모라 콜드스타트/대기열로 느릴 수 있어 타임아웃 + 1회 재시도를 둔다.
 */
const TIMEOUT_MS = 120_000;
const ENDPOINT = '/tryon';

async function fileDataToBuffer(entry: unknown): Promise<{ buffer: Buffer; mimeType: string }> {
  if (entry && typeof entry === 'object' && 'url' in entry && typeof (entry as { url: unknown }).url === 'string') {
    const url = (entry as { url: string }).url;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HF Space 결과 이미지 다운로드 실패: ${res.status}`);
    const mimeType = res.headers.get('content-type') ?? 'image/png';
    return { buffer: Buffer.from(await res.arrayBuffer()), mimeType };
  }
  if (typeof entry === 'string') {
    const res = await fetch(entry);
    if (!res.ok) throw new Error(`HF Space 결과 이미지 다운로드 실패: ${res.status}`);
    const mimeType = res.headers.get('content-type') ?? 'image/png';
    return { buffer: Buffer.from(await res.arrayBuffer()), mimeType };
  }
  if (entry instanceof Blob) {
    return { buffer: Buffer.from(await entry.arrayBuffer()), mimeType: entry.type || 'image/png' };
  }
  throw new Error('HF Space 응답 형식을 해석할 수 없습니다');
}

/**
 * Gradio 클라이언트는 실패 시 Error가 아니라 status 객체
 * (`{ stage: 'error', message: "'IndexError'", ... }`)로 reject한다 —
 * 그대로 두면 상위에서 "[object Object]"가 되므로 Error로 정규화한다.
 */
function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    const detail =
      (typeof obj.message === 'string' && obj.message) ||
      (typeof obj.original_msg === 'string' && obj.original_msg) ||
      (typeof obj.title === 'string' && obj.title) ||
      '';
    if (detail) return new Error(String(detail).replace(/^'|'$/g, ''));
    try {
      return new Error(JSON.stringify(obj));
    } catch {
      return new Error('알 수 없는 HF Space 오류');
    }
  }
  return new Error(String(err));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('HF Space 응답 시간 초과')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function callOnce(env: ServerEnv, input: TryOnInput): Promise<TryOnResult> {
  const start = Date.now();
  const client = await Client.connect(env.hfSpace, env.hfToken ? { hf_token: env.hfToken as `hf_${string}` } : undefined);

  const result = await client.predict(ENDPOINT, {
    dict: { background: handle_file(input.person), layers: [], composite: null },
    garm_img: handle_file(input.garment),
    garment_des: input.garmentDescription,
    is_checked: true,
    is_checked_crop: false,
    denoise_steps: 30,
    seed: 42,
  });

  const data = result.data as unknown[];
  const { buffer, mimeType } = await fileDataToBuffer(data[0]);

  return {
    image: buffer,
    mimeType,
    providerId: `hf:${env.hfSpace}`,
    latencyMs: Date.now() - start,
  };
}

export function createHfSpaceProvider(env: ServerEnv): TryOnProvider {
  return {
    id: `hf:${env.hfSpace}`,
    async generate(input: TryOnInput): Promise<TryOnResult> {
      try {
        return await withTimeout(callOnce(env, input), TIMEOUT_MS);
      } catch (err) {
        const first = toError(err);
        console.error(`[hfSpace] 1차 시도 실패, 재시도: ${first.message}`);
        try {
          return await withTimeout(callOnce(env, input), TIMEOUT_MS);
        } catch (retryErr) {
          throw toError(retryErr);
        }
      }
    },
  };
}
