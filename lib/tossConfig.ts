/**
 * Toss Payments key resolver
 *
 * 모드 결정:
 *   1순위: DB `AppSetting` 에 저장된 값 (어드민이 실시간 스위칭 가능)
 *   2순위: NODE_ENV === "production" → "live", 아니면 "test"
 *
 * DB 값은 10초 메모리 캐시 (매 결제마다 DB 히트 방지).
 * 어드민이 모드 변경 시 invalidatePaymentModeCache() 호출.
 */

import { prisma } from "@/lib/prisma";

export type TossMode = "live" | "test";

const SETTING_KEY = "payment.toss.mode";
const CACHE_TTL_MS = 10_000;

let cachedMode: TossMode | null = null;
let cachedAt = 0;

function fallbackMode(): TossMode {
  return process.env.NODE_ENV === "production" ? "live" : "test";
}

export function invalidatePaymentModeCache() {
  cachedMode = null;
  cachedAt = 0;
}

export async function getTossMode(): Promise<TossMode> {
  const now = Date.now();
  if (cachedMode && now - cachedAt < CACHE_TTL_MS) return cachedMode;

  try {
    const row = await prisma.appSetting.findUnique({
      where: { key: SETTING_KEY },
    });
    const raw =
      row && typeof row.value === "object" && row.value !== null
        ? (row.value as { mode?: string }).mode
        : undefined;
    const mode: TossMode =
      raw === "live" ? "live" : raw === "test" ? "test" : fallbackMode();
    cachedMode = mode;
    cachedAt = now;
    return mode;
  } catch (err) {
    console.warn("[tossConfig] DB mode lookup failed, using NODE_ENV fallback:", err);
    return fallbackMode();
  }
}

export async function setTossMode(mode: TossMode, adminId: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: { mode }, updatedBy: adminId },
    update: { value: { mode }, updatedBy: adminId },
  });
  invalidatePaymentModeCache();
}

function secretKeyFor(mode: TossMode): string {
  const modeKey =
    mode === "live"
      ? process.env.TOSS_LIVE_SECRET_KEY
      : process.env.TOSS_TEST_SECRET_KEY;
  const legacyKey = process.env.TOSS_SECRET_KEY;
  return (modeKey ?? legacyKey ?? "").trim();
}

function clientKeyFor(mode: TossMode): string {
  const modeKey =
    mode === "live"
      ? process.env.NEXT_PUBLIC_TOSS_LIVE_CLIENT_KEY
      : process.env.NEXT_PUBLIC_TOSS_TEST_CLIENT_KEY;
  const legacyKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  return (modeKey ?? legacyKey ?? "").trim();
}

export async function getTossSecretKey(): Promise<string> {
  const mode = await getTossMode();
  return secretKeyFor(mode);
}

export async function getTossClientKey(): Promise<string> {
  const mode = await getTossMode();
  return clientKeyFor(mode);
}

export async function getTossPaymentConfig(): Promise<{
  mode: TossMode;
  clientKey: string;
}> {
  const mode = await getTossMode();
  return { mode, clientKey: clientKeyFor(mode) };
}
