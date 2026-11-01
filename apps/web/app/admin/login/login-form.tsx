"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("Wrong password");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <label className="block">
        <span className="text-xs font-medium text-[#7A7A7A]">Password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full rounded-xl border border-[#2E2E2E] bg-[#141414] px-4 py-3 text-white outline-none focus:border-[#C8FF2E]/50"
          required
        />
      </label>
      {error ? <p className="text-sm text-[#FF6E6E]">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="cta-lime flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold disabled:opacity-60"
        style={{ color: "#0F1115" }}
      >
        {busy ? "Signing in…" : "Enter"}
      </button>
    </form>
  );
}
