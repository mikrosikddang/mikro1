const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
if (!serviceKey) {
  console.error("DATA_GO_KR_SERVICE_KEY missing");
  process.exit(1);
}

// 테스트 케이스: 알려진 활동 사업자(국세청), 폐업자, 잘못된 번호
const cases = [
  { label: "삼성전자(주)", bno: "1248100998" },
  { label: "(주)카카오",   bno: "1208147521" },
  { label: "잘못된 번호",   bno: "0000000000" },
];

const url = `https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=${encodeURIComponent(
  serviceKey,
)}`;

for (const c of cases) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ b_no: [c.bno] }),
  });
  const text = await res.text();
  console.log(`\n[${c.label}] ${c.bno}`);
  console.log(`  http=${res.status}`);
  console.log(`  body=${text.slice(0, 400)}`);
}
