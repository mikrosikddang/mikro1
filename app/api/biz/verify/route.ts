import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

const NTS_STATUS_URL =
  "https://api.odcloud.kr/api/nts-businessman/v1/status";

interface NtsStatusItem {
  b_no: string;
  b_stt: string; // "계속사업자" | "휴업자" | "폐업자" | ""
  b_stt_cd: string; // "01"=계속, "02"=휴업, "03"=폐업
  tax_type: string; // 과세유형 메시지
  tax_type_cd: string; // "01"~"08"
  end_dt: string;
  utcc_yn: string;
  tax_type_change_dt: string;
  invoice_apply_dt: string;
  rbf_tax_type: string;
  rbf_tax_type_cd: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
    if (!serviceKey) {
      return NextResponse.json(
        { error: "사업자번호 인증 서비스를 사용할 수 없습니다." },
        { status: 503 },
      );
    }

    const { bizRegNo } = (await req.json()) as { bizRegNo?: string };
    if (!bizRegNo) {
      return NextResponse.json(
        { error: "사업자등록번호를 입력해주세요." },
        { status: 400 },
      );
    }

    const cleaned = bizRegNo.replace(/[^0-9]/g, "");
    if (cleaned.length !== 10) {
      return NextResponse.json(
        { error: "사업자등록번호는 10자리 숫자여야 합니다." },
        { status: 400 },
      );
    }

    const url = `${NTS_STATUS_URL}?serviceKey=${encodeURIComponent(serviceKey)}`;
    const ntsRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ b_no: [cleaned] }),
    });

    if (!ntsRes.ok) {
      console.error("NTS API error:", ntsRes.status, await ntsRes.text());
      return NextResponse.json(
        { error: "국세청 조회에 실패했습니다. 잠시 후 다시 시도해주세요." },
        { status: 502 },
      );
    }

    const body = await ntsRes.json();
    const items: NtsStatusItem[] = body.data ?? [];

    if (items.length === 0) {
      return NextResponse.json(
        { error: "조회 결과가 없습니다." },
        { status: 404 },
      );
    }

    const item = items[0];

    // b_stt_cd: "01"=계속사업자, "02"=휴업, "03"=폐업
    const isActive = item.b_stt_cd === "01";
    const statusLabel =
      item.b_stt_cd === "01"
        ? "계속사업자"
        : item.b_stt_cd === "02"
          ? "휴업자"
          : item.b_stt_cd === "03"
            ? "폐업자"
            : "확인불가";

    return NextResponse.json({
      verified: isActive,
      bizRegNo: cleaned,
      status: statusLabel,
      taxType: item.tax_type || null,
    });
  } catch (error) {
    console.error("POST /api/biz/verify error:", error);
    return NextResponse.json(
      { error: "사업자번호 인증 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
