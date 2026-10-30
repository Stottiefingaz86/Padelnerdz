import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'pn.localAccount.v1';

export type LocalAccount = {
  kind: 'local';
  id: string;
  display_name: string | null;
  onboarding_completed: boolean;
  phone_e164: string | null;
  avatar_url?: string | null;
  created_at: string;
};

function idFromPhone(phone: string) {
  let hash = 2166136261;
  for (let i = 0; i < phone.length; i++) {
    hash ^= phone.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `local_${(hash >>> 0).toString(16)}`;
}

export async function loadLocalAccount(): Promise<LocalAccount | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalAccount;
    if (!parsed?.id?.startsWith('local_')) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveLocalAccount(account: LocalAccount): Promise<LocalAccount> {
  await AsyncStorage.setItem(KEY, JSON.stringify(account));
  return account;
}

export async function clearLocalAccount() {
  await AsyncStorage.removeItem(KEY);
}

/** Create or resume a phone account on this device (used when SMS OTP isn’t available). */
export async function upsertLocalAccountFromPhone(phoneE164: string): Promise<LocalAccount> {
  const existing = await loadLocalAccount();
  if (existing?.phone_e164 === phoneE164) {
    return existing;
  }

  const account: LocalAccount = {
    kind: 'local',
    id: idFromPhone(phoneE164),
    display_name: null,
    onboarding_completed: false,
    phone_e164: phoneE164,
    avatar_url: null,
    created_at: new Date().toISOString(),
  };
  return saveLocalAccount(account);
}

export async function updateLocalAccount(
  patch: Partial<Pick<LocalAccount, 'display_name' | 'avatar_url' | 'onboarding_completed'>>,
): Promise<LocalAccount | null> {
  const current = await loadLocalAccount();
  if (!current) return null;
  const next: LocalAccount = {
    ...current,
    ...patch,
    display_name:
      patch.display_name !== undefined ? patch.display_name : current.display_name,
    avatar_url: patch.avatar_url !== undefined ? patch.avatar_url : current.avatar_url,
  };
  return saveLocalAccount(next);
}

export function isLocalProfileId(id: string | null | undefined) {
  return Boolean(id?.startsWith('local_'));
}
