/** 업로드된 사진을 정사각/세로 프레임으로 크롭 후 지정 크기로 축소한다. */
export async function prepImage(
  file: File,
  maxDimension = 512,
  aspect: 'square' | 'portrait' = 'square',
): Promise<{ blob: Blob; dataUrl: string }> {
  const bitmap = await createImageBitmap(file);

  const targetRatio = aspect === 'square' ? 1 : 3 / 4;
  const srcRatio = bitmap.width / bitmap.height;

  let sx = 0;
  let sy = 0;
  let sw = bitmap.width;
  let sh = bitmap.height;

  if (srcRatio > targetRatio) {
    sw = bitmap.height * targetRatio;
    sx = (bitmap.width - sw) / 2;
  } else {
    sh = bitmap.width / targetRatio;
    sy = (bitmap.height - sh) / 2;
  }

  const outWidth = aspect === 'square' ? maxDimension : Math.round(maxDimension * (3 / 4));
  const outHeight = aspect === 'square' ? maxDimension : maxDimension;

  const canvas = new OffscreenCanvas(outWidth, outHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outWidth, outHeight);

  const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.9 });
  const dataUrl = await blobToDataUrl(blob);

  return { blob, dataUrl };
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
