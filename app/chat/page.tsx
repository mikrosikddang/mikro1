import { redirect } from "next/navigation";
import Container from "@/components/Container";
import { getSession } from "@/lib/auth";

export default async function ChatPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login?next=/chat");
  }

  return (
    <Container>
      <div className="pt-4 pb-20">
        <h1 className="text-[22px] font-bold text-black mb-6">채팅</h1>
        <div className="py-20 text-center">
          <p className="text-[40px] mb-3">💬</p>
          <p className="text-[15px] text-gray-500">
            준비 중인 기능입니다
          </p>
          <p className="text-[12px] text-gray-400 mt-1">
            MVP placeholder
          </p>
        </div>
      </div>
    </Container>
  );
}
