import { isAdmin } from "@/lib/admin-auth";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (await isAdmin()) {
    return <AdminShell>{children}</AdminShell>;
  }
  return <>{children}</>;
}
