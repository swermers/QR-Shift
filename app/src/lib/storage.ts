// KV-backed storage for QR-Shift.
//
// In production on Vercel, set UPSTASH_REDIS_REST_URL and
// UPSTASH_REDIS_REST_TOKEN (Vercel's Upstash integration does this for you).
// If those env vars are missing, a process-local in-memory store is used so
// `npm run dev` works out of the box — but data is lost on restart and NOT
// shared between serverless instances in production.

import { Redis } from "@upstash/redis";
import type { QRCode, RoutingRule, ScanEvent } from "@/types/database";

const SCAN_HISTORY_LIMIT = 1000;

interface KVDriver {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  del(key: string): Promise<void>;
  lpush(key: string, value: string): Promise<void>;
  ltrim(key: string, start: number, stop: number): Promise<void>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
}

function makeRedisDriver(): KVDriver {
  const redis = Redis.fromEnv();
  return {
    async get<T>(key: string) {
      return (await redis.get<T>(key)) ?? null;
    },
    async set<T>(key: string, value: T) {
      await redis.set(key, value);
    },
    async del(key: string) {
      await redis.del(key);
    },
    async lpush(key: string, value: string) {
      await redis.lpush(key, value);
    },
    async ltrim(key: string, start: number, stop: number) {
      await redis.ltrim(key, start, stop);
    },
    async lrange(key: string, start: number, stop: number) {
      const res = await redis.lrange<string>(key, start, stop);
      return res ?? [];
    },
  };
}

function makeMemoryDriver(): KVDriver {
  const g = globalThis as unknown as { __qrShiftMem?: Map<string, unknown> };
  if (!g.__qrShiftMem) g.__qrShiftMem = new Map<string, unknown>();
  const store = g.__qrShiftMem;
  return {
    async get<T>(key: string) {
      return (store.get(key) as T | undefined) ?? null;
    },
    async set<T>(key: string, value: T) {
      store.set(key, value);
    },
    async del(key: string) {
      store.delete(key);
    },
    async lpush(key: string, value: string) {
      const list = (store.get(key) as string[] | undefined) ?? [];
      list.unshift(value);
      store.set(key, list);
    },
    async ltrim(key: string, start: number, stop: number) {
      const list = (store.get(key) as string[] | undefined) ?? [];
      const sliced = list.slice(start, stop + 1);
      store.set(key, sliced);
    },
    async lrange(key: string, start: number, stop: number) {
      const list = (store.get(key) as string[] | undefined) ?? [];
      const end = stop === -1 ? list.length : stop + 1;
      return list.slice(start, end);
    },
  };
}

let driverInstance: KVDriver | null = null;

function driver(): KVDriver {
  if (driverInstance) return driverInstance;
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    driverInstance = makeRedisDriver();
  } else {
    driverInstance = makeMemoryDriver();
  }
  return driverInstance;
}

export function isPersistent(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

const qrKey = (slug: string) => `qr:${slug}`;
const rulesKey = (slug: string) => `rules:${slug}`;
const scansKey = (slug: string) => `scans:${slug}`;

// QR codes ------------------------------------------------------------------

export async function getQR(slug: string): Promise<QRCode | null> {
  return driver().get<QRCode>(qrKey(slug));
}

export async function saveQR(qr: QRCode): Promise<void> {
  await driver().set(qrKey(qr.slug), qr);
}

export async function deleteQR(slug: string): Promise<void> {
  const d = driver();
  await Promise.all([d.del(qrKey(slug)), d.del(rulesKey(slug)), d.del(scansKey(slug))]);
}

// Rules ---------------------------------------------------------------------

export async function getRules(slug: string): Promise<RoutingRule[]> {
  return (await driver().get<RoutingRule[]>(rulesKey(slug))) ?? [];
}

export async function saveRules(slug: string, rules: RoutingRule[]): Promise<void> {
  await driver().set(rulesKey(slug), rules);
}

// Scans ---------------------------------------------------------------------

export async function recordScan(slug: string, event: ScanEvent): Promise<void> {
  const d = driver();
  await d.lpush(scansKey(slug), JSON.stringify(event));
  await d.ltrim(scansKey(slug), 0, SCAN_HISTORY_LIMIT - 1);
}

export async function getScans(slug: string, limit = SCAN_HISTORY_LIMIT): Promise<ScanEvent[]> {
  const raw = await driver().lrange(scansKey(slug), 0, limit - 1);
  const out: ScanEvent[] = [];
  for (const entry of raw) {
    try {
      // Upstash sometimes returns values that are already parsed objects.
      if (typeof entry === "string") {
        out.push(JSON.parse(entry) as ScanEvent);
      } else {
        out.push(entry as ScanEvent);
      }
    } catch {
      // Skip malformed entries rather than blowing up analytics.
    }
  }
  return out;
}

export async function incrementScanCount(
  slug: string,
  source: "qr_scan" | "short_link",
): Promise<void> {
  const qr = await getQR(slug);
  if (!qr) return;
  if (source === "qr_scan") qr.scan_count = (qr.scan_count ?? 0) + 1;
  else qr.click_count = (qr.click_count ?? 0) + 1;
  await saveQR(qr);
}
