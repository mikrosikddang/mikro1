import { redirect } from "next/navigation";
import { getSession, isAdmin } from "@/lib/auth";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Require ADMIN role
  if (!session || !isAdmin(session.role)) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin header */}
      <div className="bg-red-900 text-white px-4 py-3 border-b border-red-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-lg font-bold">
              🛡️ Admin Panel
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/admin" className="hover:underline">
                Overview
              </Link>
              <Link href="/admin/sellers" className="hover:underline">
                Sellers
              </Link>
              <Link href="/admin/orders" className="hover:underline">
                Orders
              </Link>
              <Link href="/admin/disputes" className="hover:underline">
                Disputes
              </Link>
            </nav>
          </div>
          <div className="text-xs bg-red-800 px-2 py-1 rounded">
            Admin: {session.userId}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">{children}</div>
    </div>
  );
}
