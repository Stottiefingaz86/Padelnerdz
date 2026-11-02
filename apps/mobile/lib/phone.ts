export type CountryOption = {
  code: string;
  dial: string;
  label: string;
  /** National number length without country code (approx). */
  minNational: number;
  maxNational: number;
  example: string;
};

/** Common padel markets first, WhatsApp-style dial code picker. */
export const COUNTRIES: CountryOption[] = [
  { code: 'ES', dial: '+34', label: 'Spain', minNational: 9, maxNational: 9, example: '612 345 678' },
  { code: 'GB', dial: '+44', label: 'United Kingdom', minNational: 10, maxNational: 10, example: '7700 900123' },
  { code: 'PT', dial: '+351', label: 'Portugal', minNational: 9, maxNational: 9, example: '912 345 678' },
  { code: 'FR', dial: '+33', label: 'France', minNational: 9, maxNational: 9, example: '6 12 34 56 78' },
  { code: 'IT', dial: '+39', label: 'Italy', minNational: 9, maxNational: 10, example: '312 345 6789' },
  { code: 'NL', dial: '+31', label: 'Netherlands', minNational: 9, maxNational: 9, example: '6 12345678' },
  { code: 'DE', dial: '+49', label: 'Germany', minNational: 10, maxNational: 11, example: '1512 3456789' },
  { code: 'US', dial: '+1', label: 'United States', minNational: 10, maxNational: 10, example: '202 555 0123' },
  { code: 'AE', dial: '+971', label: 'UAE', minNational: 9, maxNational: 9, example: '50 123 4567' },
  { code: 'AR', dial: '+54', label: 'Argentina', minNational: 10, maxNational: 10, example: '11 2345 6789' },
  { code: 'MX', dial: '+52', label: 'Mexico', minNational: 10, maxNational: 10, example: '55 1234 5678' },
];

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Build E.164 from dial code + national number. */
export function toE164(dial: string, national: string): string {
  let n = digitsOnly(national);
  // Drop leading 0 used in some national formats (UK/FR/etc.)
  if (n.startsWith('0')) n = n.slice(1);
  return `${dial}${n}`;
}

export function validateNational(country: CountryOption, national: string): string | null {
  let n = digitsOnly(national);
  if (n.startsWith('0')) n = n.slice(1);
  if (n.length < country.minNational || n.length > country.maxNational) {
    return `Enter a valid ${country.label} number (${country.example})`;
  }
  return null;
}
