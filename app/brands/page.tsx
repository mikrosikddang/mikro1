import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import Container from "@/components/Container";

export default async function BrandsPage() {
  const sellers = await prisma.sellerProfile.findMany({
    where: { status: "APPROVED" },
    orderBy: { shopName: "asc" },
    include: { user: true },
  });

  return (
    <Container>
      <div className="pt-4 pb-20">
        <h1 className="text-[22px] font-bold text-black mb-1">입점 브랜드</h1>
        <p className="text-[13px] text-gray-500 mb-6">
          {sellers.length}개 브랜드
        </p>

        {sellers.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-[40px] mb-3">🏬</p>
            <p className="text-[15px] text-gray-500">
              아직 입점된 브랜드가 없어요
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sellers.map((seller) => (
              <Link
                key={seller.id}
                href={`/s/${seller.userId}`}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                {seller.avatarUrl ? (
                  <Image
                    src={seller.avatarUrl}
                    alt={seller.shopName}
                    width={44}
                    height={44}
                    className="w-11 h-11 rounded-full object-cover bg-white shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-[18px] font-bold text-gray-500 shrink-0">
                    {seller.shopName.charAt(0)}
                  </div>
                )}
                <span className="text-[15px] font-medium text-gray-900 truncate">
                  {seller.shopName}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
