/**
 * 토스페이먼츠 지급대행(Payouts) API 래퍼
 *
 * 참고: https://docs.tosspayments.com/reference#지급대행
 *
 * 동작 조건:
 *   - 가맹점 대시보드에서 "지급대행" 서비스 신청/승인 완료 필요
 *   - 지급대행용 Secret Key 는 일반 결제 Secret Key 와 공유됨 (라이브 키 기준)
 *     단, 토스가 별도 키를 내려주는 가맹점도 있으므로 환경변수 분리를 권장.
 *     TOSS_PAYOUT_SECRET_KEY 가 설정되어 있으면 우선 사용, 없으면 결제 키 재사용.
 */

import { getTossSecretKey } from "@/lib/tossConfig";

const PAYOUTS_BASE_URL = "https://api.tosspayments.com/v1/payouts";

function resolveSecretKey(): Promise<string | null> | string | null {
  const override = process.env.TOSS_PAYOUT_SECRET_KEY;
  if (override && override.length > 0) return override;
  return getTossSecretKey();
}

async function authHeader(): Promise<string> {
  const key = await resolveSecretKey();
  if (!key) throw new Error("TOSS_PAYOUT_SECRET_KEY_MISSING");
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

/* ────────────────────────────────────────────────
 * 셀러 등록 / 조회
 * ──────────────────────────────────────────────── */

export type TossSellerBusinessType = "INDIVIDUAL" | "INDIVIDUAL_BUSINESS" | "CORPORATE";

export type TossSellerRegisterParams = {
  refSellerId: string; // 우리 시스템의 SellerProfile.id
  businessType: TossSellerBusinessType;
  company?: {
    name: string;                  // 법인명 / 상호명
    representativeName: string;    // 대표자명
    businessRegistrationNumber: string; // 사업자등록번호 (하이픈 제거)
    email: string;
    phone: string;
  };
  individual?: {
    name: string;
    email: string;
    phone: string;
    // 개인 셀러는 추가 KYC 서류가 필요하며, 토스 대시보드에서 처리.
  };
  account: {
    bankCode: string;  // 토스 공식 은행 코드
    accountNumber: string;
    holderName: string;
  };
};

type TossSellerResponse = {
  id: string;
  refSellerId?: string;
  status?: string; // "KYC_WAITING" | "APPROVED" | "KYC_REJECTED" 등
  businessType?: TossSellerBusinessType;
  createdAt?: string;
};

/**
 * 토스 Payouts 셀러 등록.
 * 미크로가 대행 등록하는 방식이므로 모든 셀러 정보를 우리가 전달.
 */
export async function registerTossSeller(
  params: TossSellerRegisterParams,
): Promise<TossSellerResponse> {
  const auth = await authHeader();
  const res = await fetch(`${PAYOUTS_BASE_URL}/sellers`, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("[tossPayouts] registerSeller failed:", res.status, text);
    throw new Error(`TOSS_SELLER_REGISTER_FAILED:${res.status}`);
  }
  return JSON.parse(text) as TossSellerResponse;
}

export async function getTossSeller(tossSellerId: string): Promise<TossSellerResponse> {
  const auth = await authHeader();
  const res = await fetch(`${PAYOUTS_BASE_URL}/sellers/${encodeURIComponent(tossSellerId)}`, {
    method: "GET",
    headers: { Authorization: auth },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("[tossPayouts] getSeller failed:", res.status, text);
    throw new Error(`TOSS_SELLER_FETCH_FAILED:${res.status}`);
  }
  return JSON.parse(text) as TossSellerResponse;
}

/* ────────────────────────────────────────────────
 * 지급 요청 / 조회 / 취소
 * ──────────────────────────────────────────────── */

export type TossPayoutRequestParams = {
  refPayoutId: string;       // 우리 시스템의 Payout.id
  destination: string;       // tossSellerId
  scheduleType: "SCHEDULED" | "EXPRESS"; // 예약 / 즉시
  amount: {
    currency: "KRW";
    value: number;
  };
  transactionDescription?: string; // 적요 (통장 표기)
  metadata?: Record<string, string>;
};

export type TossPayoutResponse = {
  id: string;
  refPayoutId?: string;
  status: string; // "REQUESTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELED"
  destination?: string;
  amount?: { currency: string; value: number };
  scheduledAt?: string;
  completedAt?: string;
  failure?: { code: string; message: string };
};

export async function requestTossPayout(
  params: TossPayoutRequestParams,
): Promise<TossPayoutResponse> {
  const auth = await authHeader();
  const res = await fetch(PAYOUTS_BASE_URL, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("[tossPayouts] requestPayout failed:", res.status, text);
    throw new Error(`TOSS_PAYOUT_REQUEST_FAILED:${res.status}`);
  }
  return JSON.parse(text) as TossPayoutResponse;
}

export async function getTossPayout(tossPayoutId: string): Promise<TossPayoutResponse> {
  const auth = await authHeader();
  const res = await fetch(`${PAYOUTS_BASE_URL}/${encodeURIComponent(tossPayoutId)}`, {
    method: "GET",
    headers: { Authorization: auth },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("[tossPayouts] getPayout failed:", res.status, text);
    throw new Error(`TOSS_PAYOUT_FETCH_FAILED:${res.status}`);
  }
  return JSON.parse(text) as TossPayoutResponse;
}

export async function cancelTossPayout(tossPayoutId: string): Promise<TossPayoutResponse> {
  const auth = await authHeader();
  const res = await fetch(`${PAYOUTS_BASE_URL}/${encodeURIComponent(tossPayoutId)}/cancel`, {
    method: "POST",
    headers: { Authorization: auth },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("[tossPayouts] cancelPayout failed:", res.status, text);
    throw new Error(`TOSS_PAYOUT_CANCEL_FAILED:${res.status}`);
  }
  return JSON.parse(text) as TossPayoutResponse;
}

/**
 * 토스 상태 문자열 → 우리 PayoutStatus 매핑
 */
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
