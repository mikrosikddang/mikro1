/**
 * 토스 지급대행 API 호출 가능 여부 점검.
 * - 셀러 등록 (POST /v1/payouts/sellers) 더미 페이로드로 시도
 * - 401/403 = 인증/계약 문제, 400 = 요청 형식 문제, 200/201 = 등록 성공
 */
const PAYOUTS_BASE = "https://api.tosspayments.com/v1/payouts";

const key =
  process.env.TOSS_PAYOUT_SECRET_KEY ||
  process.env.TOSS_LIVE_SECRET_KEY ||
  process.env.TOSS_TEST_SECRET_KEY;

if (!key) {
  console.error("Toss secret key 환경변수 없음");
  process.exit(1);
}

const auth = `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
const refSellerId = `mikro-probe-${Date.now()}`;

const body = {
  refSellerId,
  businessType: "INDIVIDUAL_BUSINESS",
  company: {
    name: "미크로 테스트 상점",
    representativeName: "테스터",
    businessRegistrationNumber: "1248100998",
    email: "test@mikro.example",
    phone: "01012345678",
  },
  account: {
    bankCode: "088", // 신한
    accountNumber: "11022233344455",
    holderName: "테스터",
  },
};

console.log(`[probe] using key prefix: ${key.slice(0, 12)}...  refSellerId=${refSellerId}\n`);

const res = await fetch(`${PAYOUTS_BASE}/sellers`, {
  method: "POST",
  headers: {
    Authorization: auth,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const text = await res.text();
console.log(`http=${res.status}`);
console.log(`body=${text}`);
console.log();

if (res.status === 200 || res.status === 201) {
  console.log("→ 지급대행 활성화 OK. 셀러 등록 성공.");
} else if (res.status === 401 || res.status === 403) {
  console.log("→ 토스 지급대행 계약 미활성 또는 키 권한 부족 (예상된 graceful fail).");
} else if (res.status === 404) {
  console.log("→ 엔드포인트 미활성 (지급대행 미신청 가맹점).");
} else if (res.status === 400) {
  console.log("→ 요청 형식 문제. 활성은 됐을 가능성 → body 메시지 확인.");
}
