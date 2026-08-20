const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encodeShareState(value: unknown): string {
  const bytes = encoder.encode(JSON.stringify(value));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export function decodeShareState<T>(encoded: string): T {
  const normalized = encoded.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return JSON.parse(decoder.decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)))) as T;
}

export function buildShareUrl(value: unknown, base = typeof location === 'undefined' ? 'https://example.invalid/' : location.href): string {
  const url = new URL(base);
  url.searchParams.set('state', encodeShareState(value));
  return url.toString();
}
