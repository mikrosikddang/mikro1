/**
 * SellerProfile → Toss Payouts 셀러 등록 동기화.
 *
 * 호출 시점:
 *   1) 어드민이 셀러 전환 승인 시 (SellerApprovalStatus=APPROVED)
 *   2) 셀러가 정산 정보(은행/계좌/사업자) 업데이트 시
 *   3) 어드민 정산 페이지에서 수동 "토스 재동기화" 클릭 시
 *
 * 실패해도 승인 자체는 막지 않음 — 에러 로그만 남김.
 * 지급대행 계약 미활성 상태에서는 토스가 4xx 로 거부하므로 graceful fallback.
 */

import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  registerTossSeller,
  type TossSellerBusinessType,
} from "@/lib/tossPayouts";
import { bankNameToCode } from "@/lib/bankCodes";

/**
 * Toss v2 의 refSellerId 는 최대 20자.
 * 우리 SellerProfile.id 는 cuid (25자) 이므로 SHA-256 해시 hex 첫 20자로 매핑.
 * 결정론적이라 동일 profile → 동일 refSellerId.
 *
 * 어드민 화면에서도 토스 콘솔과 대조하기 위해 동일 함수가 필요하므로 export.
 */
export function buildRefSellerId(profileId: string): string {
  return crypto.createHash("sha256").update(profileId).digest("hex").slice(0, 20);
}

export type TossSellerSyncResult =
  | { ok: true; tossSellerId: string; status: string | null }
  | { ok: false; code: "ALREADY_REGISTERED"; tossSellerId: string }
  | { ok: false; code: "MISSING_FIELDS"; missing: string[] }
  | { ok: false; code: "BANK_CODE_UNKNOWN"; bankName: string | null }
  | { ok: false; code: "TOSS_ERROR"; message: string };

export async function syncSellerToTossPayouts(
  sellerProfileId: string,
): Promise<TossSellerSyncResult> {
  const profile = await prisma.sellerProfile.findUnique({
    where: { id: sellerProfileId },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  if (!profile) {
    return { ok: false, code: "MISSING_FIELDS", missing: ["sellerProfile"] };
  }

  // 이미 등록돼있으면 스킵 (업데이트는 추후 구현)
  if (profile.tossSellerId) {
    return { ok: false, code: "ALREADY_REGISTERED", tossSellerId: profile.tossSellerId };
  }

  // 필수 필드 체크
  const missing: string[] = [];
  if (!profile.settlementBank) missing.push("settlementBank");
  if (!profile.settlementAccountNo) missing.push("settlementAccountNo");
  if (!profile.settlementAccountHolder) missing.push("settlementAccountHolder");
  if (!profile.settlementEmail && !profile.user.email) missing.push("settlementEmail");
  if (!profile.settlementPhone) missing.push("settlementPhone");

  const isBusiness = profile.isBusinessSeller;
  if (isBusiness) {
    if (!profile.bizName) missing.push("bizName");
    if (!profile.bizOwnerName) missing.push("bizOwnerName");
    if (!profile.bizRegNo) missing.push("bizRegNo");
  }

  if (missing.length > 0) {
    return { ok: false, code: "MISSING_FIELDS", missing };
  }

  const bankCode = bankNameToCode(profile.settlementBank);
  if (!bankCode) {
    return { ok: false, code: "BANK_CODE_UNKNOWN", bankName: profile.settlementBank };
  }

  const email = profile.settlementEmail || profile.user.email || "";
  const phone = (profile.settlementPhone || "").replace(/-/g, "");
  const holderName = profile.settlementAccountHolder!;
  const accountNumber = (profile.settlementAccountNo || "").replace(/-/g, "");

  const businessType: TossSellerBusinessType = isBusiness
    ? profile.taxType === "GENERAL_CORP"
      ? "CORPORATE"
      : "INDIVIDUAL_BUSINESS"
    : "INDIVIDUAL";

  try {
    const response = await registerTossSeller({
      refSellerId: buildRefSellerId(profile.id),
      businessType,
      ...(isBusiness
        ? {
            company: {
              name: profile.bizName!,
              representativeName: profile.bizOwnerName!,
              businessRegistrationNumber: (profile.bizRegNo || "").replace(/-/g, ""),
              email,
              phone,
            },
          }
        : {
            individual: {
              name: holderName,
              email,
              phone,
            },
          }),
      account: {
        bankCode,
        accountNumber,
        holderName,
      },
    });

    await prisma.sellerProfile.update({
      where: { id: profile.id },
      data: {
        tossSellerId: response.id,
        tossSellerStatus: response.status ?? null,
        tossSellerRegisteredAt: new Date(),
      },
    });

    return { ok: true, tossSellerId: response.id, status: response.status ?? null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN";
    console.error("[tossSellerSync] register failed:", sellerProfileId, message);
    return { ok: false, code: "TOSS_ERROR", message };
  }
}
