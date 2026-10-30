import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { isChannelSoundOn } from './channel-prefs';

type SoundKind = 'tick' | 'chat' | 'success' | 'confirm';

type AudioPlayerLike = {
  volume: number;
  play: () => void;
  seekTo: (seconds: number) => void | Promise<void>;
};

const players: Partial<Record<SoundKind, AudioPlayerLike>> = {};
const sources: Partial<Record<SoundKind, number>> = {};

/** Quiet — haptic carries the feel; audio is a soft companion. */
const VOLUMES: Record<SoundKind, number> = {
  tick: 0.55,
  chat: 0.4,
  success: 0.58,
  confirm: 0.62,
};

let audioReady = false;
let audioUnavailable = false;
let globalSounds = true;

export function setGlobalSoundsEnabled(on: boolean) {
  globalSounds = on;
}

export function getGlobalSoundsEnabled() {
  return globalSounds;
}

function loadSource(kind: SoundKind): number {
  const existing = sources[kind];
  if (existing != null) return existing;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const map = {
    tick: require('../assets/sounds/tick.wav'),
    chat: require('../assets/sounds/chat.wav'),
    success: require('../assets/sounds/success.wav'),
    confirm: require('../assets/sounds/confirm.wav'),
  } as Record<SoundKind, number>;
  sources[kind] = map[kind];
  return map[kind];
}

async function ensureAudio() {
  if (audioReady || audioUnavailable) return;
  try {
    const audio = await import('expo-audio');
    await audio.setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    });
    audioReady = true;
  } catch {
    audioUnavailable = true;
  }
}

async function getPlayer(kind: SoundKind) {
  if (audioUnavailable) return null;
  const cached = players[kind];
  if (cached) return cached;
  try {
    await ensureAudio();
    if (audioUnavailable) return null;
    const audio = await import('expo-audio');
    const player = audio.createAudioPlayer(loadSource(kind));
    player.volume = VOLUMES[kind];
    players[kind] = player;
    return player;
  } catch {
    audioUnavailable = true;
    return null;
  }
}

async function playSound(kind: SoundKind, channelId?: string) {
  if (!globalSounds) return;
  if (channelId && !(await isChannelSoundOn(channelId))) return;
  try {
    const player = await getPlayer(kind);
    if (!player) return;
    await player.seekTo(0);
    player.volume = VOLUMES[kind];
    player.play();
  } catch {
    // ignore
  }
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/** Fire haptics immediately — never wait on audio. */
async function buzz(
  ios: () => Promise<void>,
  android: Haptics.AndroidHaptics = Haptics.AndroidHaptics.Keyboard_Tap,
) {
  try {
    if (Platform.OS === 'android') {
      await Haptics.performAndroidHapticsAsync(android);
    } else {
      await ios();
    }
  } catch {
    try {
      await ios();
    } catch {
      // ignore
    }
  }
}

/** Firm press — feel it on every tap. */
export async function tap() {
  await buzz(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    Haptics.AndroidHaptics.Virtual_Key,
  );
}

export async function select() {
  await buzz(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid),
    Haptics.AndroidHaptics.Segment_Tick,
  );
}

export async function heavy() {
  await buzz(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
    Haptics.AndroidHaptics.Confirm,
  );
}

export async function warn() {
  await buzz(
    () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
    Haptics.AndroidHaptics.Reject,
  );
}

/** Register interest — strong roll then soft tick. */
export async function registerPulse(channelId?: string) {
  void playSound('tick', channelId);
  await buzz(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    Haptics.AndroidHaptics.Confirm,
  );
  await sleep(45);
  await buzz(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
    Haptics.AndroidHaptics.Confirm,
  );
  await sleep(55);
  await buzz(
    () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    Haptics.AndroidHaptics.Confirm,
  );
}

/**
 * Revolut-style transfer cascade — soft ticks building to a success thud.
 * Use when registering interest for a mix-in.
 */
export async function revolutPulse(channelId?: string) {
  void playSound('confirm', channelId);
  const soft = [
    Haptics.ImpactFeedbackStyle.Soft,
    Haptics.ImpactFeedbackStyle.Light,
    Haptics.ImpactFeedbackStyle.Light,
    Haptics.ImpactFeedbackStyle.Medium,
    Haptics.ImpactFeedbackStyle.Medium,
    Haptics.ImpactFeedbackStyle.Rigid,
  ] as const;
  for (let i = 0; i < soft.length; i += 1) {
    await buzz(
      () => Haptics.impactAsync(soft[i]!),
      i < 3 ? Haptics.AndroidHaptics.Segment_Tick : Haptics.AndroidHaptics.Confirm,
    );
    await sleep(38 + i * 12);
  }
  await sleep(40);
  await buzz(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
    Haptics.AndroidHaptics.Confirm,
  );
  await sleep(70);
  await buzz(
    () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    Haptics.AndroidHaptics.Confirm,
  );
}

/** Confetti / acceptance — big celebration feel. */
export async function celebratePulse() {
  void playSound('success');
  await buzz(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
    Haptics.AndroidHaptics.Confirm,
  );
  await sleep(70);
  await buzz(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    Haptics.AndroidHaptics.Confirm,
  );
  await sleep(50);
  await buzz(
    () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    Haptics.AndroidHaptics.Confirm,
  );
  await sleep(90);
  await buzz(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft),
    Haptics.AndroidHaptics.Segment_Tick,
  );
}

/** New chat message — quiet pop + selection buzz. */
export async function chatAlert(channelId: string) {
  void playSound('chat', channelId);
  await buzz(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid),
    Haptics.AndroidHaptics.Context_Click,
  );
}

/** You just sent a message — soft tick (outgoing). */
export async function messageSent(channelId?: string) {
  void playSound('tick', channelId);
  await buzz(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    Haptics.AndroidHaptics.Keyboard_Tap,
  );
}

/** Save / confirm — soft double thud + success haptic. */
export async function success(channelId?: string) {
  void playSound('success', channelId);
  await buzz(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    Haptics.AndroidHaptics.Confirm,
  );
  await sleep(55);
  await buzz(
    () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    Haptics.AndroidHaptics.Confirm,
  );
}

/** Payment confirmed — richer thud + heavy cascade. */
export async function paymentSuccess() {
  void playSound('confirm');
  await buzz(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    Haptics.AndroidHaptics.Confirm,
  );
  await sleep(50);
  await buzz(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
    Haptics.AndroidHaptics.Confirm,
  );
  await sleep(60);
  await buzz(
    () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    Haptics.AndroidHaptics.Confirm,
  );
}
