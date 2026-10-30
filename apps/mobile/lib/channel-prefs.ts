import AsyncStorage from '@react-native-async-storage/async-storage';

export type ChannelPrefs = {
  muted: boolean;
  sounds: boolean;
};

const KEY = 'pn.channelPrefs.v1';

let cache: Record<string, ChannelPrefs> = {};
let loaded = false;

async function load() {
  if (loaded) return;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Record<string, ChannelPrefs>) : {};
  } catch {
    cache = {};
  }
  loaded = true;
}

async function persist() {
  await AsyncStorage.setItem(KEY, JSON.stringify(cache));
}

export async function getChannelPrefs(channelId: string): Promise<ChannelPrefs> {
  await load();
  return cache[channelId] ?? { muted: false, sounds: true };
}

export async function setChannelPrefs(
  channelId: string,
  patch: Partial<ChannelPrefs>,
): Promise<ChannelPrefs> {
  await load();
  const next = { ...(cache[channelId] ?? { muted: false, sounds: true }), ...patch };
  cache[channelId] = next;
  await persist();
  return next;
}

export async function isChannelSoundOn(channelId: string) {
  const p = await getChannelPrefs(channelId);
  return !p.muted && p.sounds;
}
