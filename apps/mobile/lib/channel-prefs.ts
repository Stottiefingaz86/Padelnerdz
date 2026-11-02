import AsyncStorage from '@react-native-async-storage/async-storage';

export type MuteDuration = '8h' | '1w' | 'always';

export type ChannelPrefs = {
  muted: boolean;
  sounds: boolean;
  /** ISO timestamp ,  mute ends after this. null = muted until unmuted (always). */
  muteUntil: string | null;
};

const KEY = 'pn.channelPrefs.v1';

let cache: Record<string, ChannelPrefs> = {};
let loaded = false;

const DEFAULTS: ChannelPrefs = { muted: false, sounds: true, muteUntil: null };

function normalize(raw: Partial<ChannelPrefs> | undefined): ChannelPrefs {
  return {
    muted: Boolean(raw?.muted),
    sounds: raw?.sounds !== false,
    muteUntil: raw?.muteUntil ?? null,
  };
}

async function load() {
  if (loaded) return;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, Partial<ChannelPrefs>>) : {};
    cache = Object.fromEntries(
      Object.entries(parsed).map(([id, prefs]) => [id, normalize(prefs)]),
    );
  } catch {
    cache = {};
  }
  loaded = true;
}

async function persist() {
  await AsyncStorage.setItem(KEY, JSON.stringify(cache));
}

/** True when mute is active (and not expired). Clears expired mutes. */
export async function isChannelMuted(channelId: string): Promise<boolean> {
  const p = await getChannelPrefs(channelId);
  if (!p.muted) return false;
  if (!p.muteUntil) return true;
  if (new Date(p.muteUntil).getTime() > Date.now()) return true;
  await setChannelPrefs(channelId, { muted: false, sounds: true, muteUntil: null });
  return false;
}

export async function getChannelPrefs(channelId: string): Promise<ChannelPrefs> {
  await load();
  const p = normalize(cache[channelId] ?? DEFAULTS);
  if (p.muted && p.muteUntil && new Date(p.muteUntil).getTime() <= Date.now()) {
    const cleared = { ...p, muted: false, sounds: true, muteUntil: null };
    cache[channelId] = cleared;
    await persist();
    return cleared;
  }
  return p;
}

export async function setChannelPrefs(
  channelId: string,
  patch: Partial<ChannelPrefs>,
): Promise<ChannelPrefs> {
  await load();
  const next = normalize({ ...(cache[channelId] ?? DEFAULTS), ...patch });
  cache[channelId] = next;
  await persist();
  return next;
}

export function muteUntilForDuration(duration: MuteDuration): string | null {
  if (duration === 'always') return null;
  const ms = duration === '8h' ? 8 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ms).toISOString();
}

export async function muteChannel(
  channelId: string,
  duration: MuteDuration,
): Promise<ChannelPrefs> {
  return setChannelPrefs(channelId, {
    muted: true,
    sounds: false,
    muteUntil: muteUntilForDuration(duration),
  });
}

export async function unmuteChannel(channelId: string): Promise<ChannelPrefs> {
  return setChannelPrefs(channelId, {
    muted: false,
    sounds: true,
    muteUntil: null,
  });
}

export function formatMuteLabel(prefs: ChannelPrefs): string {
  if (!prefs.muted) return 'Mute';
  if (!prefs.muteUntil) return 'Muted';
  const until = new Date(prefs.muteUntil);
  const now = new Date();
  const sameDay =
    until.getFullYear() === now.getFullYear() &&
    until.getMonth() === now.getMonth() &&
    until.getDate() === now.getDate();
  if (sameDay) {
    return `Muted until ${until.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return `Muted until ${until.toLocaleDateString([], {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export async function isChannelSoundOn(channelId: string) {
  if (await isChannelMuted(channelId)) return false;
  const p = await getChannelPrefs(channelId);
  return p.sounds;
}
