import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { getSupabase, getSupabaseLoose, isSupabaseConfigured } from './supabase';

/** Build a JSON export of the signed-in user’s data for GDPR portability. */
export async function exportMyData(userId: string): Promise<{ path: string; preview: string }> {
  if (!isSupabaseConfigured) {
    throw new Error('Sign in with a live account to export data');
  }

  const sb = getSupabaseLoose();
  const [
    profile,
    memberships,
    regs,
    messages,
    tokens,
  ] = await Promise.all([
    sb.from('profiles').select('*').eq('id', userId).maybeSingle(),
    sb.from('group_memberships').select('group_id, role, created_at').eq('user_id', userId),
    sb
      .from('session_registrations')
      .select('session_id, status, created_at, payment_claimed_at, payment_verified_at')
      .eq('user_id', userId),
    sb
      .from('group_messages')
      .select('id, group_id, body, kind, created_at')
      .eq('sender_id', userId)
      .limit(500),
    sb.from('device_push_tokens').select('platform, updated_at').eq('user_id', userId),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    user_id: userId,
    profile: profile.data,
    group_memberships: memberships.data ?? [],
    session_registrations: regs.data ?? [],
    recent_messages_sent: messages.data ?? [],
    push_devices: tokens.data ?? [],
  };

  const json = JSON.stringify(payload, null, 2);
  const fileName = `padel-nerdz-export-${userId.slice(0, 8)}.json`;

  if (Platform.OS === 'web') {
    // Browser download
    return { path: 'web', preview: json };
  }

  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) throw new Error('No writable directory');
  const path = `${dir}${fileName}`;
  await FileSystem.writeAsStringAsync(path, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: 'application/json',
      dialogTitle: 'Export your Padel Nerdz data',
    });
  }

  return { path, preview: json.slice(0, 400) };
}

/** Permanently delete the authenticated account (edge function + auth). */
export async function deleteMyAccount(): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Not signed in');
  const { error } = await getSupabase().functions.invoke('delete-account', {
    body: {},
  });
  if (error) throw error;
  await getSupabase().auth.signOut();
}
