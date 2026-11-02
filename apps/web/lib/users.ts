/**
 * Users for the admin back office, live Supabase profiles only.
 * Never invent names or phone numbers.
 */

import { formatPhoneWithCountry, initialsFromName } from "./phone-format";
import { getSupabaseAdminConfig, supabaseAdminGet } from "./supabase-admin";

export type AdminUser = {
  id: string;
  displayName: string;
  initials: string;
  avatarUrl: string | null;
  phoneE164: string;
  phoneDisplay: string;
  countryLabel: string;
  createdAt: string;
  source: "live";
};

export async function getAdminUsers(): Promise<{
  users: AdminUser[];
  note: string;
  error?: string;
}> {
  if (!getSupabaseAdminConfig()) {
    return {
      users: [],
      note: "No users shown. Add SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to apps/web/.env.local, fabricated user lists are not allowed.",
      error: "SUPABASE_SERVICE_ROLE_KEY not set",
    };
  }

  const result = await supabaseAdminGet<
    Array<{
      id: string;
      display_name: string | null;
      phone_e164: string | null;
      avatar_url: string | null;
      created_at: string;
    }>
  >(
    "profiles?select=id,display_name,phone_e164,avatar_url,created_at&order=created_at.desc",
  );

  if (!result.ok) {
    return {
      users: [],
      note: "Could not load profiles from Supabase.",
      error: result.error,
    };
  }

  return {
    users: result.data.map((r) => {
      const displayName = r.display_name?.trim() || "(no display name yet)";
      const phone = formatPhoneWithCountry(r.phone_e164);
      return {
        id: r.id,
        displayName,
        initials: initialsFromName(displayName),
        avatarUrl: r.avatar_url?.trim() || null,
        phoneE164: phone.e164 || r.phone_e164?.trim() || "",
        phoneDisplay: r.phone_e164?.trim() ? phone.display : "(no phone on profile)",
        countryLabel: r.phone_e164?.trim() ? phone.countryLabel : "-",
        createdAt: r.created_at,
        source: "live" as const,
      };
    }),
    note:
      result.data.length === 0
        ? "Live query OK, zero profiles yet. Real beta signups will appear here after Twilio OTP + onboarding."
        : `Live from Supabase · ${result.data.length} profile(s).`,
  };
}
