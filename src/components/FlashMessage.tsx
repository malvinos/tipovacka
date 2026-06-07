"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Zobrazí krátkou potvrzovací hlášku z URL parametru `?msg=` (úspěch) nebo
 * `?err=` (chyba), pak parametr z adresy odstraní a po chvíli hlášku skryje.
 */
export function FlashMessage() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const msg = params.get("msg");
  const err = params.get("err");

  const [toast, setToast] = useState<{ kind: "ok" | "err"; body: string } | null>(
    null,
  );

  useEffect(() => {
    if (msg) setToast({ kind: "ok", body: msg });
    else if (err) setToast({ kind: "err", body: err });
    if (msg || err) router.replace(pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msg, err]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 card px-4 py-3 text-sm font-medium shadow-lg fade-in ${
        toast.kind === "ok" ? "badge-success" : "badge-warning"
      }`}
      role="status"
    >
      {toast.kind === "ok" ? "✓ " : "⚠ "}
      {toast.body}
    </div>
  );
}
