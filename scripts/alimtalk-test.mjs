

const BIZM_API_BASE = process.env.BIZM_API_BASE || "https://alimtalk-api.bizmsg.kr";
const userId = process.env.BIZM_USER_ID;
const profileKey = process.env.BIZM_SENDER_PROFILE_KEY;

const TESTS = [
  {
    status: "PAID",
    tmplId: process.env.BIZM_TEMPLATE_ORDER_PAID,
    msg: `[미크로] 주문이 확정되었습니다.\n\n주문번호: TEST-PAID-0001\n주문자명: 테스터\n결제금액: 39,000원\n배송지: 서울시 테스트구 테스트로 1\n\n감사합니다.`,
  },
  {
    status: "CANCELLED",
    tmplId: process.env.BIZM_TEMPLATE_ORDER_CANCELLED,
    msg: `[미크로] 주문이 취소되었습니다.\n\n주문번호: TEST-CANC-0001\n주문자명: 테스터\n\n이용해 주셔서 감사합니다.`,
  },
  {
    status: "SHIPPED",
    tmplId: process.env.BIZM_TEMPLATE_ORDER_SHIPPED,
    msg: `[미크로] 상품 발송이 완료되었습니다.\n\n주문번호: TEST-SHIP-0001\n택배사: CJ대한통운\n송장번호: 1234567890\n\n배송 조회는 택배사 홈페이지에서 확인해주세요.`,
  },
  {
    status: "COMPLETED",
    tmplId: process.env.BIZM_TEMPLATE_ORDER_COMPLETED,
    msg: `[미크로] 주문이 완료되었습니다.\n\n주문번호: TEST-COMP-0001\n주문자명: 테스터\n\n미크로를 이용해 주셔서 감사합니다.`,
  },
  {
    status: "REFUNDED",
    tmplId: process.env.BIZM_TEMPLATE_ORDER_REFUNDED,
    msg: `[미크로] 환불이 완료되었습니다.\n\n주문번호: TEST-REFD-0001\n환불금액: 39,000원\n\n이용해 주셔서 감사합니다.`,
  },
];

const PHONES = ["821091865859", "821073740979"];

for (const t of TESTS) {
  console.log(`\n=== ${t.status} (${t.tmplId}) ===`);
  for (const phn of PHONES) {
    const started = Date.now();
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
          button1: { name: "채널 추가", type: "AC" },
        },
      ]),
    });
    const raw = await res.text();
    const elapsed = Date.now() - started;
    console.log(`${phn}: http=${res.status} ${elapsed}ms body=${raw.slice(0, 200)}`);
  }
}
