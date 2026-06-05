"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setError(error.message);
      else
        setMessage(
          "Hotovo! Zkontroluj e-mail a potvrď registraci kliknutím na odkaz.",
        );
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setError(error.message);
      else {
        router.push("/");
        router.refresh();
      }
    }
    setLoading(false);
  }

  async function handleOAuth(provider: "google" | "discord") {
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="card p-8">
        <h1 className="text-2xl font-bold mb-1">
          {mode === "signin" ? "Přihlášení" : "Registrace"}
        </h1>
        <p className="text-muted text-sm mb-6">
          {mode === "signin"
            ? "Přihlas se a pojď tipovat."
            : "Vytvoř si účet a začni tipovat."}
        </p>

        <div className="flex flex-col gap-3 mb-6">
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            className="btn btn-outline"
          >
            Pokračovat přes Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuth("discord")}
            className="btn btn-outline"
          >
            Pokračovat přes Discord
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted mb-6">
          <div className="h-px flex-1 bg-border" />
          nebo e-mailem
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleEmail} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="E-mail"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Heslo"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading
              ? "Pracuji…"
              : mode === "signin"
                ? "Přihlásit se"
                : "Zaregistrovat se"}
          </button>
        </form>

        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
        {message && <p className="text-sm text-green-600 mt-4">{message}</p>}

        <p className="text-sm text-muted mt-6 text-center">
          {mode === "signin" ? "Nemáš účet? " : "Už máš účet? "}
          <button
            type="button"
            className="text-primary font-medium"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setMessage(null);
            }}
          >
            {mode === "signin" ? "Zaregistruj se" : "Přihlas se"}
          </button>
        </p>
      </div>
    </div>
  );
}
