import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import { removeBackground } from '@imgly/background-removal-node';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TONE_PATH = path.resolve(__dirname, '../../../assets/mood-refs/tone.json');

interface MoodTone {
  avgColor: { r: number; g: number; b: number };
  brightness: number;
}

let cachedTone: MoodTone | null = null;

async function loadTone(): Promise<MoodTone> {
  if (cachedTone) return cachedTone;
  const raw = await readFile(TONE_PATH, 'utf-8');
  cachedTone = JSON.parse(raw) as MoodTone;
  return cachedTone;
}

/** studio 배경색 — 무신사 스냅 레퍼런스의 연회색/화이트 톤을 근사. */
const STUDIO_BG = { r: 237, g: 237, b: 234 };

/**
 * 합성 결과 이미지를 무신사 스냅 1~10의 톤에 맞춰 후처리한다:
 * 1) rembg 대신 Node 호환 @imgly/background-removal-node로 배경 제거
 * 2) 심플한 스튜디오 단색 배경으로 합성
 * 3) 스냅 레퍼런스 평균 밝기에 30%만큼 근접하도록 보정 (과보정 방지)
 */
export async function applyMoodPostprocess(input: Buffer, mimeType = 'image/png'): Promise<Buffer> {
  const tone = await loadTone();

  // Buffer를 그대로 넘기면 Blob의 type이 비어 "Unsupported format" 에러가 난다 —
  // 반드시 명시적으로 mime type을 지정한 Blob으로 감싸야 한다.
  const foregroundBlob = await removeBackground(new Blob([input as unknown as ArrayBuffer], { type: mimeType }), {
    output: { format: 'image/png' },
  });
  const foreground = Buffer.from(await foregroundBlob.arrayBuffer());

  const meta = await sharp(foreground).metadata();
  const width = meta.width ?? 768;
  const height = meta.height ?? 1024;

  const composited = await sharp({
    create: { width, height, channels: 3, background: STUDIO_BG },
  })
    .png()
    .composite([{ input: foreground, blend: 'over' }])
    .toBuffer();

  const stats = await sharp(composited).stats();
  const ownBrightness =
    0.299 * stats.channels[0].mean + 0.587 * stats.channels[1].mean + 0.114 * stats.channels[2].mean;

  const rawFactor = ownBrightness > 0 ? tone.brightness / ownBrightness : 1;
  // 30%만 근접시켜 자연스러움을 유지 (완전히 일치시키면 피부톤이 부자연스러워짐)
  const brightnessFactor = Math.min(1.2, Math.max(0.85, 1 + 0.3 * (rawFactor - 1)));

  return sharp(composited)
    .modulate({ brightness: brightnessFactor, saturation: 1.03 })
    .jpeg({ quality: 92 })
    .toBuffer();
}
