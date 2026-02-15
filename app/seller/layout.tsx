import { redirect } from "next/navigation";
import Container from "@/components/Container";
import { getSession, canAccessSellerFeatures } from "@/lib/auth";

export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session || !canAccessSellerFeatures(session.role)) {
    redirect("/login?next=/seller");
  }

  return <Container>{children}</Container>;
}
