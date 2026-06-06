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
            <GoogleIcon />
            Pokračovat přes Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuth("discord")}
            className="btn btn-outline"
          >
            <DiscordIcon />
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="#5865F2"
      aria-hidden="true"
    >
      <path d="M20.317 4.369A19.79 19.79 0 0 0 15.885 3a13.9 13.9 0 0 0-.617 1.27 18.27 18.27 0 0 0-5.535 0A13.9 13.9 0 0 0 9.115 3a19.79 19.79 0 0 0-4.432 1.369C1.07 9.78.083 15.044.577 20.232a19.93 19.93 0 0 0 6.072 3.07c.49-.67.926-1.382 1.302-2.13a12.95 12.95 0 0 1-2.05-.985c.172-.126.34-.257.503-.39a14.23 14.23 0 0 0 12.192 0c.165.137.333.268.503.39-.654.39-1.343.72-2.052.986.376.747.812 1.459 1.302 2.13a19.9 19.9 0 0 0 6.073-3.07c.58-6.01-.99-11.227-4.157-15.864zM8.02 17.04c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.955 2.42-2.157 2.42zm7.96 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.946 2.42-2.157 2.42z" />
    </svg>
  );
}
