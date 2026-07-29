export async function shortHash(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
