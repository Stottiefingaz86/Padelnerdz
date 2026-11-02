import { cookies } from "next/headers";

export const ADMIN_COOKIE = "pn_admin_session";

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "padelnerdz-admin";
}

export async function isAdminAuthed(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return token === sessionToken();
}

export function sessionToken(): string {
  // Lightweight gate for early back office, replace with real auth later.
  const secret = process.env.ADMIN_SESSION_SECRET ?? getAdminPassword();
  return Buffer.from(`pn:${secret}`).toString("base64url");
}
