import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getSupabaseLoose, isSupabaseConfigured } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function projectId(): string | undefined {
  return (
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId
  );
}

/** Ask OS permission and upsert Expo push token for this device. */
export async function registerDevicePushToken(userId: string): Promise<string | null> {
  if (Platform.OS === 'web' || !userId || !isSupabaseConfigured) return null;
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('chat', {
      name: 'Chat & mix-ins',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 80, 180],
      lightColor: '#C8FF2E',
    });
  }

  const id = projectId();
  if (!id) return null;

  const token = (
    await Notifications.getExpoPushTokenAsync({ projectId: id })
  ).data;

  await getSupabaseLoose().from('device_push_tokens').upsert(
    {
      user_id: userId,
      token,
      platform: Platform.OS,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,token' },
  );

  return token;
}

/** WhatsApp-style banner when a message arrives (foreground / local). */
export async function presentChatNotification(input: {
  title: string;
  body: string;
  href: string;
  channelId?: string;
}) {
  if (Platform.OS === 'web') return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      sound: true,
      data: { href: input.href, channelId: input.channelId ?? null },
      ...(Platform.OS === 'android' ? { channelId: 'chat' } : null),
    },
    trigger: null,
  });
}

/** Local banner when a mission / medal unlocks. */
export async function presentAchievementNotification(input: {
  title: string;
  body: string;
}) {
  if (Platform.OS === 'web') return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('achievements', {
      name: 'Missions & medals',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 220, 100, 220],
      lightColor: '#C8FF2E',
    });
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      sound: true,
      data: { href: '/(tabs)/profile', kind: 'achievement' },
      ...(Platform.OS === 'android' ? { channelId: 'achievements' } : null),
    },
    trigger: null,
  });
}

/** Schedule a local reminder ~1 hour before mix-in start. */
export async function scheduleMixinReminder(input: {
  sessionId: string;
  title: string;
  startsAt: string;
}) {
  if (Platform.OS === 'web') return;
  const start = new Date(input.startsAt).getTime();
  const fireAt = start - 60 * 60 * 1000;
  const delayMs = fireAt - Date.now();
  if (delayMs < 15_000) return;

  const identifier = `mixin-1h-${input.sessionId}`;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    /* not scheduled yet */
  }

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: 'Mix-in in 1 hour',
      body: `${input.title} starts soon — get ready.`,
      sound: true,
      data: {
        href: `/group/session/${input.sessionId}`,
        sessionId: input.sessionId,
      },
      ...(Platform.OS === 'android' ? { channelId: 'chat' } : null),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(fireAt),
    },
  });
}

export async function cancelMixinReminder(sessionId: string) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(`mixin-1h-${sessionId}`);
  } catch {
    /* ignore */
  }
}

/** Ask the edge function to push other members (works when their app is killed). */
export async function requestRemoteChatPush(input: {
  kind: 'group' | 'session_room' | 'dm';
  channelId: string;
  messageId: string;
  title: string;
  body: string;
  href: string;
  senderId: string | null;
}) {
  if (!isSupabaseConfigured) return;
  try {
    await getSupabaseLoose().functions.invoke('notify-chat', {
      body: input,
    });
  } catch (e) {
    console.warn('notify-chat invoke failed', e);
  }
}
