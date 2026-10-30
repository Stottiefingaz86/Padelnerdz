/** Common dial codes longest-first so we don't mis-split (e.g. 1 vs 1242). */
const DIAL_CODES: Array<{ code: string; iso: string }> = [
  { code: "351", iso: "PT" },
  { code: "353", iso: "IE" },
  { code: "34", iso: "ES" },
  { code: "33", iso: "FR" },
  { code: "44", iso: "GB" },
  { code: "49", iso: "DE" },
  { code: "39", iso: "IT" },
  { code: "31", iso: "NL" },
  { code: "32", iso: "BE" },
  { code: "41", iso: "CH" },
  { code: "43", iso: "AT" },
  { code: "46", iso: "SE" },
  { code: "47", iso: "NO" },
  { code: "45", iso: "DK" },
  { code: "48", iso: "PL" },
  { code: "54", iso: "AR" },
  { code: "52", iso: "MX" },
  { code: "55", iso: "BR" },
  { code: "61", iso: "AU" },
  { code: "64", iso: "NZ" },
  { code: "81", iso: "JP" },
  { code: "82", iso: "KR" },
  { code: "86", iso: "CN" },
  { code: "91", iso: "IN" },
  { code: "971", iso: "AE" },
  { code: "966", iso: "SA" },
  { code: "27", iso: "ZA" },
  { code: "1", iso: "US/CA" },
];

export type FormattedPhone = {
  /** Display with + and spaced national number */
  display: string;
  /** ISO-ish country label e.g. ES (+34) */
  countryLabel: string;
  e164: string;
};

export function formatPhoneWithCountry(raw: string | null | undefined): FormattedPhone {
  if (!raw?.trim()) {
    return { display: "—", countryLabel: "—", e164: "" };
  }
  const digits = raw.replace(/\D/g, "");
  if (!digits) {
    return { display: raw.trim(), countryLabel: "—", e164: raw.trim() };
  }

  const match = DIAL_CODES.find((c) => digits.startsWith(c.code));
  if (!match) {
    const e164 = `+${digits}`;
    return { display: e164, countryLabel: "?", e164 };
  }

  const national = digits.slice(match.code.length);
  const spaced =
    match.code === "34" && national.length === 9
      ? `${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`
      : national.replace(/(\d{3,4})(?=\d)/g, "$1 ").trim();

  const e164 = `+${match.code}${national}`;
  return {
    display: `+${match.code} ${spaced}`.trim(),
    countryLabel: `${match.iso} (+${match.code})`,
    e164,
  };
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
}
