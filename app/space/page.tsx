import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUserSpaceProfile } from "@/lib/userSpace";

type Props = {
  searchParams: Promise<{ welcome?: string }>;
};

export default async function SpacePage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/space");
  }

  const profile = await ensureUserSpaceProfile(prisma, {
    id: session.userId,
    name: session.name,
    email: session.email,
  });

  const { welcome } = await searchParams;
  const suffix = welcome ? `?welcome=${encodeURIComponent(welcome)}` : "";
  redirect(`/${profile.storeSlug}${suffix}`);
}
