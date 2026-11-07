export const MAX_CACHEABLE_CHARACTERS = 1000;
export const CACHE_RETENTION_DAYS = 90;

export function isCacheableText(text: string): boolean {
  return text.length > 0 && text.length <= MAX_CACHEABLE_CHARACTERS;
}
