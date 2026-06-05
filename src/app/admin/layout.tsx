import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Admin panel</h1>
        <Link href="/admin" className="text-sm text-muted hover:text-foreground">
          Přehled tipovaček
        </Link>
      </div>
      {children}
    </div>
  );
}
