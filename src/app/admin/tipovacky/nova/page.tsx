import Link from "next/link";
import { createPool } from "@/app/admin/actions";

export default function NewPoolPage() {
  return (
    <div className="max-w-2xl">
      <Link
        href="/admin"
        className="text-sm text-muted hover:text-foreground"
      >
        ← Zpět na přehled
      </Link>
      <h2 className="text-lg font-semibold mt-3 mb-6">Nová tipovačka</h2>

      <form action={createPool} className="card p-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Název</span>
          <input name="name" required className="input" placeholder="Např. Liga mistrů 2026" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Popis</span>
          <textarea name="description" rows={2} className="input" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Pravidla tipování</span>
          <textarea
            name="rules"
            rows={4}
            className="input"
            placeholder="Např. Za přesný výsledek 3 body, za správného vítěze 1 bod."
          />
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_public" defaultChecked />
          <span className="text-sm">Veřejná (vidí ji každý)</span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            Přístupový kód <span className="text-muted">(jen pro soukromou)</span>
          </span>
          <input name="join_code" className="input" placeholder="Např. TAJNY-KOD-123" />
        </label>

        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary">
            Vytvořit tipovačku
          </button>
        </div>
      </form>
    </div>
  );
}
