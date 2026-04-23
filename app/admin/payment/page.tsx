import { getTossMode } from "@/lib/tossConfig";
import PaymentModeSwitch from "./PaymentModeSwitch";

export const dynamic = "force-dynamic";

export default async function AdminPaymentPage() {
  const currentMode = await getTossMode();
  const liveReady = Boolean(
    (process.env.TOSS_LIVE_SECRET_KEY ?? "").trim() &&
      (process.env.NEXT_PUBLIC_TOSS_LIVE_CLIENT_KEY ?? "").trim(),
  );
  const testReady = Boolean(
    (process.env.TOSS_TEST_SECRET_KEY ?? "").trim() &&
      (process.env.NEXT_PUBLIC_TOSS_TEST_CLIENT_KEY ?? "").trim(),
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">결제 설정</h1>
      <p className="text-sm text-gray-600 mb-6">
        토스페이먼츠의 라이브/테스트 모드를 실시간으로 전환할 수 있습니다.
        재배포 없이 즉시 반영됩니다.
      </p>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-1">현재 모드</p>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${
                currentMode === "live"
                  ? "bg-gray-900 text-white"
                  : "bg-amber-100 text-amber-900 border border-amber-300"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  currentMode === "live" ? "bg-green-400" : "bg-amber-500"
                }`}
              />
              {currentMode === "live" ? "LIVE (실 결제)" : "TEST (테스트)"}
            </span>
          </div>
        </div>

        <PaymentModeSwitch
          currentMode={currentMode}
          liveReady={liveReady}
          testReady={testReady}
        />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900 space-y-2">
        <p className="font-semibold">⚠️ 주의사항</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>모드 변경은 약 10초 이내에 모든 결제 요청에 반영됩니다.</li>
          <li>
            진행 중인 결제(이미 토스 결제창에 진입한 건)는 시작 시점의 모드로
            처리되며, 모드 전환 직후 1~2건은 이전 모드로 완료될 수 있습니다.
          </li>
          <li>
            환불/취소 API 호출은 <strong>호출 시점 모드</strong>의 시크릿 키로
            수행됩니다. 라이브→테스트 전환 시 라이브에서 결제된 건의 환불은
            실패할 수 있으므로, 전환 전 미처리 건을 모두 정리하세요.
          </li>
          <li>모든 모드 변경은 관리자 감사 로그(AdminActionLog)에 기록됩니다.</li>
        </ul>
      </div>

      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
        <p className="font-semibold mb-2">환경변수 상태</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center justify-between px-3 py-2 bg-white rounded border">
            <span>LIVE 키</span>
            <span
              className={
                liveReady ? "text-green-700 font-medium" : "text-red-700 font-medium"
              }
            >
              {liveReady ? "✓ 설정됨" : "✗ 누락"}
            </span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 bg-white rounded border">
            <span>TEST 키</span>
            <span
              className={
                testReady ? "text-green-700 font-medium" : "text-red-700 font-medium"
              }
            >
              {testReady ? "✓ 설정됨" : "✗ 누락"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
