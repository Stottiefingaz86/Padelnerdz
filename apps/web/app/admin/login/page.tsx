import { redirect } from "next/navigation";

import { isAdminAuthed } from "@/lib/admin-auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Admin login" };

export default async function AdminLoginPage() {
  if (await isAdminAuthed()) {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0F1115] px-6">
      <div className="w-full max-w-sm">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#C8FF2E]">
          Mixy
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-white">
          Back office
        </h1>
        <p className="mt-2 text-sm text-[#7A7A7A]">
          Metrics and product analytics — not part of the consumer app.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
