import { LRUCache } from 'lru-cache';

const cache = new LRUCache<string, any>({
  max: 500,
  ttl: 30_000,
});

export async function cached<T>(key: string, fn: () => Promise<T>, ttlMs = 30_000): Promise<T> {
  const hit = cache.get(key);

  if (hit !== undefined) {
    return hit as T;
  }

  const value = await fn();

  cache.set(key, value, {
    ttl: ttlMs,
  });

  return value;
}

export function invalidate(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}
