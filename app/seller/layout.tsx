import { redirect } from "next/navigation";
import Container from "@/components/Container";
import { getSession } from "@/lib/auth";
import { hasSellerPortalAccess } from "@/lib/sellerPortal";

export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!(await hasSellerPortalAccess(session))) {
    redirect("/login?next=/seller");
  }

  return <Container>{children}</Container>;
}
