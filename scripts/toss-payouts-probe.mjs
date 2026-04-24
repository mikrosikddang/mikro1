/**
 * 토스 지급대행 v2 API 접속 점검 (JWE 암호화 포함).
 *
 * 사용:
 *   TOSS_PAYOUT_SECRET_KEY=live_sk_... \
 *   TOSS_PAYOUT_SECURITY_KEY=<64자 hex 보안키> \
 *   node scripts/toss-payouts-probe.mjs
 *
 * 결과 해석:
 *   200/201 → 셀러 등록 성공 (지급대행 활성)
 *   400     → 요청 형식 문제 (계약 활성 OK, payload 검증 실패) — body 확인
 *   401     → 시크릿키 잘못
 *   403     → 권한 부족
 *   404     → 지급대행 미신청 가맹점 또는 엔드포인트 자체 비활성
 */

import { CompactEncrypt, compactDecrypt } from "jose";
import crypto from "node:crypto";

const PAYOUTS_BASE = "https://api.tosspayments.com";

const secretKey = (process.env.TOSS_PAYOUT_SECRET_KEY || "").trim();
const securityKeyHex = (process.env.TOSS_PAYOUT_SECURITY_KEY || "").trim();

if (!secretKey) {
  console.error("ERROR: TOSS_PAYOUT_SECRET_KEY 환경변수 없음");
  process.exit(1);
}
if (!/^[0-9a-fA-F]{64}$/.test(securityKeyHex)) {
  console.error("ERROR: TOSS_PAYOUT_SECURITY_KEY 가 64자 hex 가 아님");
  process.exit(1);
}

const securityKey = Buffer.from(securityKeyHex, "hex");
const auth = `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;

function nowIsoSeoul() {
  const d = new Date();
  const seoul = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${seoul.getUTCFullYear()}-${pad(seoul.getUTCMonth() + 1)}-${pad(seoul.getUTCDate())}` +
    `T${pad(seoul.getUTCHours())}:${pad(seoul.getUTCMinutes())}:${pad(seoul.getUTCSeconds())}+09:00`
  );
}

async function jweEncrypt(payload) {
  const json = new TextEncoder().encode(JSON.stringify(payload));
  return await new CompactEncrypt(json)
    .setProtectedHeader({
      alg: "dir",
      enc: "A256GCM",
      iat: nowIsoSeoul(),
      nonce: crypto.randomUUID(),
    })
    .encrypt(securityKey);
}

async function jweDecrypt(jwe) {
  const { plaintext } = await compactDecrypt(jwe, securityKey);
  return new TextDecoder().decode(plaintext);
}

// refSellerId 는 v2 에서 최대 20자
const refSellerId = `mp${Date.now()}`.slice(0, 20);

// 테스트 환경에서는 CORPORATE 만 등록 가능. 라이브에서도 법인이 더 단순.
const body = {
  refSellerId,
  businessType: "CORPORATE",
  company: {
    name: "미크로 프로브 테스트",
    representativeName: "테스터",
    businessRegistrationNumber: "1248100998",
    email: "probe@mikrobrand.kr",
    phone: "01012345678",
  },
  account: {
    bankCode: "088",
    accountNumber: "11022233344455",
    holderName: "테스터",
  },
  metadata: { source: "mikro-probe" },
};

console.log(`[probe] secretKey=${secretKey.slice(0, 12)}...`);
console.log(`[probe] securityKey=${securityKeyHex.slice(0, 8)}... (${securityKeyHex.length}자)`);
console.log(`[probe] refSellerId=${refSellerId}\n`);

const encrypted = await jweEncrypt(body);
console.log(`[probe] JWE length=${encrypted.length} chars`);

const res = await fetch(`${PAYOUTS_BASE}/v2/sellers`, {
  method: "POST",
  headers: {
    Authorization: auth,
    "Content-Type": "text/plain",
    "TossPayments-api-security-mode": "ENCRYPTION",
  },
  body: encrypted,
});

const text = await res.text();
console.log(`\nhttp=${res.status}`);

if (res.ok && text) {
  try {
    const decrypted = await jweDecrypt(text);
    console.log(`decrypted body=\n${decrypted}\n`);
    console.log("→ ✅ 지급대행 v2 OK. 셀러 등록 성공.");
  } catch (e) {
    console.log(`raw body=${text.slice(0, 500)}`);
    console.log(`복호화 실패: ${e.message}`);
  }
} else {
  // 에러는 평문 JSON 일 수도, 암호화된 응답일 수도 있음
  let parsed = text;
  try {
    parsed = JSON.parse(text);
    console.log(`error body=${JSON.stringify(parsed, null, 2)}`);
  } catch {
    try {
      parsed = await jweDecrypt(text);
      console.log(`decrypted error=${parsed}`);
    } catch {
      console.log(`raw body=${text.slice(0, 500)}`);
    }
  }
  if (res.status === 401) console.log("→ 시크릿 키 인증 실패");
  else if (res.status === 403) console.log("→ 권한 부족 (지급대행 계약 미활성 가능)");
  else if (res.status === 404) console.log("→ 엔드포인트 미활성 (지급대행 미신청)");
  else if (res.status === 400) console.log("→ 요청 형식 문제 (계약 OK, payload 검증 실패)");
}
