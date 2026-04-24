/**
 * 토스페이먼츠 지급대행 v2 API 래퍼
 *
 * 도큐먼트:
 *   - 가이드: https://docs.tosspayments.com/guides/v2/payouts
 *   - 레퍼런스: https://docs.tosspayments.com/reference/additional
 *
 * 핵심 차이 (v1 → v2):
 *   1. 엔드포인트: /v1/payouts/sub-malls → /v2/sellers, /v2/payouts
 *   2. POST Request Body 는 모두 JWE(A256GCM) 로 암호화 필수
 *   3. 응답도 JWE 로 암호화되어 옴 → 같은 보안키로 복호화
 *   4. 헤더: TossPayments-api-security-mode: ENCRYPTION
 *   5. Content-Type: text/plain (JSON 아님)
 *
 * 환경변수:
 *   - TOSS_PAYOUT_SECRET_KEY    : Basic Auth 용 시크릿 키 (live_sk_*)
 *   - TOSS_PAYOUT_SECURITY_KEY  : JWE 보안 키 (64자 hex)
 *
 * 둘 다 "API 개별 연동 키" 메뉴에서 발급 (결제위젯의 gsk_* 와 다름).
 */

import crypto from "node:crypto";
import { CompactEncrypt, compactDecrypt } from "jose";

const PAYOUTS_BASE_URL = "https://api.tosspayments.com";

function getSecretKey(): string {
  const k = (process.env.TOSS_PAYOUT_SECRET_KEY ?? "").trim();
  if (!k) throw new Error("TOSS_PAYOUT_SECRET_KEY_MISSING");
  return k;
}

function getSecurityKey(): Buffer {
  const hex = (process.env.TOSS_PAYOUT_SECURITY_KEY ?? "").trim();
  if (!hex) throw new Error("TOSS_PAYOUT_SECURITY_KEY_MISSING");
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("TOSS_PAYOUT_SECURITY_KEY_INVALID (must be 64-char hex)");
  }
  return Buffer.from(hex, "hex");
}

function basicAuth(): string {
  return `Basic ${Buffer.from(`${getSecretKey()}:`).toString("base64")}`;
}

function nowIsoSeoul(): string {
  const d = new Date();
  const utcMs = d.getTime();
  const seoul = new Date(utcMs + 9 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${seoul.getUTCFullYear()}-${pad(seoul.getUTCMonth() + 1)}-${pad(seoul.getUTCDate())}` +
    `T${pad(seoul.getUTCHours())}:${pad(seoul.getUTCMinutes())}:${pad(seoul.getUTCSeconds())}+09:00`
  );
}

async function jweEncrypt(payload: unknown): Promise<string> {
  const key = getSecurityKey();
  const json = new TextEncoder().encode(JSON.stringify(payload));
  return await new CompactEncrypt(json)
    .setProtectedHeader({
      alg: "dir",
      enc: "A256GCM",
      iat: nowIsoSeoul(),
      nonce: crypto.randomUUID(),
    } as never)
    .encrypt(key);
}

async function jweDecrypt<T = unknown>(jwe: string): Promise<T> {
  const key = getSecurityKey();
  const { plaintext } = await compactDecrypt(jwe, key);
  const text = new TextDecoder().decode(plaintext);
  return JSON.parse(text) as T;
}

/* ──────────────────────────────────────────────
 * 공통 fetch 래퍼 — JWE 암호화 / 복호화 / 에러 처리
 * ────────────────────────────────────────────── */

type TossErrorBody = {
  version?: string;
  traceId?: string;
  entityType?: "error" | string;
  entityBody?: { code?: string; message?: string; details?: unknown };
  // 평문 응답(인증 실패 등)
  code?: string;
  message?: string | { error?: string; message?: string; status?: number };
};

export class TossPayoutsApiError extends Error {
  status: number;
  code?: string;
  detail?: unknown;
  constructor(message: string, status: number, code?: string, detail?: unknown) {
    super(message);
    this.name = "TossPayoutsApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

async function postEncrypted<T>(path: string, body: unknown): Promise<T> {
  const encrypted = await jweEncrypt(body);
  const res = await fetch(`${PAYOUTS_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "text/plain",
      "TossPayments-api-security-mode": "ENCRYPTION",
    },
    body: encrypted,
  });

  const text = await res.text();
  if (!res.ok) {
    // 평문 JSON 에러 (인증 실패 등) 또는 JWE 에러 시도
    let parsed: TossErrorBody | string = text;
    try {
      parsed = JSON.parse(text) as TossErrorBody;
    } catch {
      try {
        parsed = await jweDecrypt<TossErrorBody>(text);
      } catch {
        /* keep raw */
      }
    }
    const code =
      typeof parsed === "object"
        ? parsed.entityBody?.code ?? parsed.code ?? undefined
        : undefined;
    const msg =
      typeof parsed === "object"
        ? parsed.entityBody?.message ??
          (typeof parsed.message === "string" ? parsed.message : undefined) ??
          `HTTP_${res.status}`
        : `HTTP_${res.status}`;
    console.error("[tossPayouts] POST failed", path, res.status, parsed);
    throw new TossPayoutsApiError(msg, res.status, code, parsed);
  }

  if (!text) return null as T;
  return await jweDecrypt<T>(text);
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${PAYOUTS_BASE_URL}${path}`, {
    method: "GET",
    headers: { Authorization: basicAuth() },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("[tossPayouts] GET failed", path, res.status, text.slice(0, 200));
    throw new TossPayoutsApiError(`HTTP_${res.status}`, res.status, undefined, text);
  }
  return JSON.parse(text) as T;
}

/* ──────────────────────────────────────────────
 * Toss v2 객체 타입
 * ────────────────────────────────────────────── */

export type TossSellerStatus =
  | "APPROVAL_REQUIRED"
  | "PARTIALLY_APPROVED"
  | "KYC_REQUIRED"
  | "APPROVED"
  | "KYC_REJECTED"
  | string;

export type TossSellerBusinessType = "INDIVIDUAL" | "INDIVIDUAL_BUSINESS" | "CORPORATE";

export type TossSellerRegisterParams = {
  refSellerId: string;
  businessType: TossSellerBusinessType;
  company?: {
    name: string;
    representativeName: string;
    businessRegistrationNumber: string;
    email: string;
    phone: string;
  };
  individual?: {
    name: string;
    email: string;
    phone: string;
  };
  account: {
    bankCode: string;
    accountNumber: string;
    holderName: string;
  };
  metadata?: Record<string, string>;
};

export type TossSellerEntity = {
  id: string;
  refSellerId?: string;
  businessType?: TossSellerBusinessType;
  status: TossSellerStatus;
  company?: TossSellerRegisterParams["company"];
  individual?: TossSellerRegisterParams["individual"];
  account?: TossSellerRegisterParams["account"];
  metadata?: Record<string, string>;
};

type V2Envelope<T> = {
  version: string;
  traceId: string;
  entityType: string;
  entityBody: T;
};

/* ──────────────────────────────────────────────
 * 셀러 등록 / 조회
 * ────────────────────────────────────────────── */

export async function registerTossSeller(
  params: TossSellerRegisterParams,
): Promise<TossSellerEntity> {
  const env = await postEncrypted<V2Envelope<TossSellerEntity>>("/v2/sellers", params);
  return env.entityBody;
}

export async function getTossSeller(sellerId: string): Promise<TossSellerEntity> {
  const env = await getJson<V2Envelope<TossSellerEntity>>(
    `/v2/sellers/${encodeURIComponent(sellerId)}`,
  );
  return env.entityBody;
}

/* ──────────────────────────────────────────────
 * 지급대행 요청 / 조회 / 취소
 * v2 는 배열로 최대 100건 동시 요청 가능
 * ────────────────────────────────────────────── */

export type TossPayoutRequestItem = {
  refPayoutId: string;
  destination: string; // sellerId
  scheduleType: "EXPRESS" | "SCHEDULED";
  payoutDate?: string; // SCHEDULED 일 때 yyyy-MM-dd
  amount: { currency: "KRW"; value: number };
  transactionDescription?: string;
  metadata?: Record<string, string>;
};

export type TossPayoutEntity = {
  id: string;
  refPayoutId?: string;
  destination: string;
  scheduleType: "EXPRESS" | "SCHEDULED";
  payoutDate?: string;
  amount: { currency: string; value: number };
  transactionDescription?: string;
  requestedAt?: string;
  status: string; // REQUESTED | IN_PROGRESS | COMPLETED | FAILED | CANCELED
  error?: { code: string; message: string } | null;
  metadata?: Record<string, string>;
};

export async function requestTossPayouts(
  items: TossPayoutRequestItem[],
): Promise<TossPayoutEntity[]> {
  const env = await postEncrypted<V2Envelope<{ items: TossPayoutEntity[] }>>(
    "/v2/payouts",
    items,
  );
  return env.entityBody.items;
}

/** 단일 지급대행 요청 헬퍼 */
export async function requestSingleTossPayout(
  item: TossPayoutRequestItem,
): Promise<TossPayoutEntity> {
  const items = await requestTossPayouts([item]);
  return items[0];
}

export async function getTossPayout(payoutId: string): Promise<TossPayoutEntity> {
  const env = await getJson<V2Envelope<TossPayoutEntity>>(
    `/v2/payouts/${encodeURIComponent(payoutId)}`,
  );
  return env.entityBody;
}

export async function cancelTossPayout(payoutId: string): Promise<TossPayoutEntity> {
  // 취소는 Body 가 없으므로 ENCRYPTION 헤더 없이 빈 POST
  const res = await fetch(
    `${PAYOUTS_BASE_URL}/v2/payouts/${encodeURIComponent(payoutId)}/cancel`,
    {
      method: "POST",
      headers: { Authorization: basicAuth() },
    },
  );
  const text = await res.text();
  if (!res.ok) {
    console.error("[tossPayouts] cancel failed", res.status, text);
    throw new TossPayoutsApiError(`HTTP_${res.status}`, res.status, undefined, text);
  }
  const env = JSON.parse(text) as V2Envelope<TossPayoutEntity>;
  return env.entityBody;
}

/* ──────────────────────────────────────────────
 * 잔액 조회
 * ────────────────────────────────────────────── */

export async function getTossPayoutBalance(): Promise<{
  pendingAmount?: { currency: string; value: number };
  availableAmount: { currency: string; value: number };
}> {
  const env = await getJson<
    V2Envelope<{
      pendingAmount?: { currency: string; value: number };
      availableAmount: { currency: string; value: number };
    }>
  >("/v2/payouts/balance");
  return env.entityBody;
}

/* ──────────────────────────────────────────────
 * 상태 매핑: Toss → 우리 PayoutStatus
 * ────────────────────────────────────────────── */

export function mapTossPayoutStatus(
  s: string | null | undefined,
): "REQUESTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELLED" {
  if (!s) return "REQUESTED";
  const upper = s.toUpperCase();
  if (upper === "REQUESTED") return "REQUESTED";
  if (upper === "IN_PROGRESS" || upper === "PROCESSING") return "IN_PROGRESS";
  if (upper === "COMPLETED" || upper === "DONE") return "COMPLETED";
  if (upper === "FAILED" || upper === "REJECTED") return "FAILED";
  if (upper === "CANCELED" || upper === "CANCELLED") return "CANCELLED";
  return "REQUESTED";
}
