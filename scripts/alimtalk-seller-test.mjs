/**
 * 셀러용 알림톡 4종 테스트 발송 스크립트.
 *
 * 사용:
 *   node ./scripts/alimtalk-seller-test.mjs
 *
 * 환경변수:
 *   BIZM_USER_ID, BIZM_SENDER_PROFILE_KEY (.env.local 에서 자동 로드)
 *
 * 발송 대상 번호는 PHONES 상수에서 관리.
 * 셀러용 버튼은 "주문 확인하기" / "요청 처리하기" / "정산 확인하기" 웹링크.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const BIZM_API_BASE = process.env.BIZM_API_BASE || "https://alimtalk-api.bizmsg.kr";
const userId = process.env.BIZM_USER_ID;
const profileKey = process.env.BIZM_SENDER_PROFILE_KEY;

if (!userId || !profileKey) {
  console.error("BIZM_USER_ID / BIZM_SENDER_PROFILE_KEY 환경변수 없음");
  process.exit(1);
}

const SITE = "https://mikrobrand.kr";

const TESTS = [
  {
    label: "①새 주문 접수",
    tmplId: "mikro_seller_order_new_v1",
    msg: `[미크로] 새 주문이 접수되었습니다.

주문번호: TEST-NEW-0001
주문자: 테스터
상품: 미크로 테스트 상품
수량: 1
결제금액: 39,000원

판매자 센터에서 주문 상세 확인 및 발송 처리 부탁드립니다.`,
    button: { name: "주문 확인하기", type: "WL", url_mobile: `${SITE}/seller/orders`, url_pc: `${SITE}/seller/orders` },
  },
  {
    label: "②주문 취소",
    tmplId: "mikro_seller_order_cancelled_v1",
    msg: `[미크로] 주문이 취소되었습니다.

주문번호: TEST-CANC-0001
주문자: 테스터
상품: 미크로 테스트 상품
사유: 단순 변심

재고가 자동 복구되었습니다.`,
    button: { name: "주문 확인하기", type: "WL", url_mobile: `${SITE}/seller/orders`, url_pc: `${SITE}/seller/orders` },
  },
  {
    label: "③교환·환불 요청 접수",
    tmplId: "mikro_seller_claim_new_v1",
    msg: `[미크로] 교환·환불 요청이 접수되었습니다.

주문번호: TEST-CLAIM-0001
요청유형: 환불
요청사유: 사이즈 불일치

판매자 센터에서 48시간 이내 처리 부탁드립니다.`,
    button: { name: "요청 처리하기", type: "WL", url_mobile: `${SITE}/seller/orders`, url_pc: `${SITE}/seller/orders` },
  },
  {
    label: "④정산 가능 안내",
    tmplId: "mikro_seller_payout_ready_v1",
    msg: `[미크로] 정산 가능 금액이 발생했습니다.

정산가능액: 320,000원
정산주기: 매주 금요일

판매자 센터에서 정산 내역을 확인하실 수 있습니다.`,
    button: { name: "정산 확인하기", type: "WL", url_mobile: `${SITE}/seller/settlements`, url_pc: `${SITE}/seller/settlements` },
  },
];

const PHONES = ["821091865859", "821073740979"];

let okCount = 0;
let failCount = 0;

for (const t of TESTS) {
  console.log(`\n=== ${t.label} (${t.tmplId}) ===`);
  for (const phn of PHONES) {
    const started = Date.now();
    try {
      const res = await fetch(`${BIZM_API_BASE}/v2/sender/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", userid: userId },
        body: JSON.stringify([
          {
            message_type: "AT",
            phn,
            profile: profileKey,
            tmplId: t.tmplId,
            msg: t.msg,
            reserveDt: "00000000000000",
            button1: t.button,
          },
        ]),
      });
      const raw = await res.text();
      const elapsed = Date.now() - started;
      let parsed = null;
      try { parsed = JSON.parse(raw); } catch {}
      const code = Array.isArray(parsed) ? parsed[0]?.code : null;
      const msgid = Array.isArray(parsed) ? parsed[0]?.data?.msgid : null;
      const errMsg = Array.isArray(parsed) ? parsed[0]?.message : null;
      const ok = res.ok && code === "success";
      if (ok) okCount += 1; else failCount += 1;
      console.log(
        `${phn}: ${ok ? "✓" : "✗"} http=${res.status} code=${code ?? "-"} msgid=${msgid ?? "-"} elapsed=${elapsed}ms${errMsg ? ` err="${errMsg}"` : ""}`,
      );
      if (!ok) console.log(`   raw=${raw.slice(0, 300)}`);
    } catch (err) {
      failCount += 1;
      console.log(`${phn}: ✗ thrown err=${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

console.log(`\n총 ${okCount + failCount}건 중 성공 ${okCount} / 실패 ${failCount}`);
process.exit(failCount > 0 ? 1 : 0);
