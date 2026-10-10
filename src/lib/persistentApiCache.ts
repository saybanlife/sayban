/**
 * Small localStorage-backed cache for GET responses that rarely change
 * (categories, and anything else that opts in via `ApiRequest`'s `cacheKey`).
 *
 * Why this exists: `ApiRequest` runs on SWR, whose cache is in-memory only and
 * whose key includes the Authorization header. That means a full refetch on
 * every page load, and a second refetch once the token resolves after
 * hydration. Persisting by a stable, auth-independent key lets repeat visits
 * paint from cache and skip the request entirely while the entry is fresh.
 *
 * Entries are namespaced and versioned so the shape can be changed later
 * without serving stale data to returning users.
 */

const NAMESPACE = "sayban:apicache";
const VERSION = "v1";

/** 12 hours. Categories change rarely, and stale entries still revalidate. */
export const DEFAULT_API_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

export type CachedApiEntry<T = unknown> = {
  data: T;
  /** Entry is past its TTL: usable for an instant paint, but revalidate. */
  stale: boolean;
  storedAt: number;
};

type StoredShape<T> = {
  storedAt: number;
  data: T;
};

function storageKey(key: string): string {
  return `${NAMESPACE}:${VERSION}:${key}`;
}

/**
 * Access is wrapped because localStorage throws rather than returning null in
 * Safari private mode and when a security policy blocks storage.
 */
function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readApiCache<T = unknown>(
  key: string,
  ttlMs: number = DEFAULT_API_CACHE_TTL_MS
): CachedApiEntry<T> | null {
  const storage = getStorage();
  if (!storage) return null;

  let raw: string | null;
  try {
    raw = storage.getItem(storageKey(key));
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: StoredShape<T>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Corrupt entry; drop it so it cannot keep failing.
    removeApiCache(key);
    return null;
  }

  if (!parsed || typeof parsed.storedAt !== "number" || !("data" in parsed)) {
    removeApiCache(key);
    return null;
  }

  const age = Date.now() - parsed.storedAt;
  // A negative age means the clock moved backwards; treat it as stale rather
  // than trusting it indefinitely.
  return {
    data: parsed.data,
    stale: age < 0 || age > ttlMs,
    storedAt: parsed.storedAt
  };
}

export function writeApiCache<T = unknown>(key: string, data: T): void {
  const storage = getStorage();
  if (!storage || data === undefined) return;

  const payload: StoredShape<T> = { storedAt: Date.now(), data };
  try {
    storage.setItem(storageKey(key), JSON.stringify(payload));
  } catch {
    // Out of quota or serialization failure. Caching is best-effort, so drop
    // any half-written entry and carry on with the network response.
    removeApiCache(key);
  }
}

export function removeApiCache(key: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(storageKey(key));
  } catch {
    /* best-effort */
  }
}

/** Clears every entry in this namespace, e.g. on logout. */
export function clearApiCache(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    const prefix = `${NAMESPACE}:`;
    const doomed: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key?.startsWith(prefix)) doomed.push(key);
    }
    doomed.forEach(key => storage.removeItem(key));
  } catch {
    /* best-effort */
  }
}
