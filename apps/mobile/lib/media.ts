import { Platform } from 'react-native';

import { getSupabaseLoose, isSupabaseConfigured } from './supabase';

const BUCKET = 'chat-media';
const SIGNED_TTL_SEC = 60 * 60 * 24; // 24h

function extFromMime(mime: string | null | undefined, fallback: string) {
  if (!mime) return fallback;
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('heic')) return 'heic';
  if (mime.includes('quicktime')) return 'mov';
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  return fallback;
}

/**
 * Upload chat media to private Supabase Storage.
 * Path: `{userId}/{groupOrRoomId}/{uuid}.{ext}`
 * Returns storage path + short-lived signed URL for immediate display.
 */
export async function uploadChatMedia(input: {
  userId: string;
  channelId: string;
  localUri: string;
  mimeType?: string | null;
  kind: 'image' | 'video';
}): Promise<{ path: string; signedUrl: string }> {
  if (!isSupabaseConfigured) {
    return { path: input.localUri, signedUrl: input.localUri };
  }

  const ext = extFromMime(input.mimeType, input.kind === 'video' ? 'mp4' : 'jpg');
  const path = `${input.userId}/${input.channelId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;

  const contentType =
    input.mimeType || (input.kind === 'video' ? 'video/mp4' : 'image/jpeg');

  // RN: fetch local file → blob/arrayBuffer for upload
  const response = await fetch(input.localUri);
  const blob = await response.blob();

  const { error } = await getSupabaseLoose().storage.from(BUCKET).upload(path, blob, {
    contentType,
    upsert: false,
  });
  if (error) throw error;

  const signedUrl = await createSignedMediaUrl(path);
  return { path, signedUrl: signedUrl || input.localUri };
}

/** Resolve a stored path or legacy local/http uri to a displayable URL. */
export async function resolveMediaDisplayUrl(
  pathOrUri: string | null | undefined,
): Promise<string | null> {
  if (!pathOrUri?.trim()) return null;
  const v = pathOrUri.trim();
  if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('file:')) {
    return v;
  }
  // Expo content / ph assets stay local (legacy messages)
  if (v.startsWith('content://') || v.startsWith('ph://') || v.startsWith('assets-library:')) {
    return v;
  }
  if (!isSupabaseConfigured) return v;
  return createSignedMediaUrl(v);
}

export async function createSignedMediaUrl(path: string): Promise<string | null> {
  const { data, error } = await getSupabaseLoose()
    .storage.from(BUCKET)
    .createSignedUrl(path, SIGNED_TTL_SEC);
  if (error) {
    console.warn('signed url failed', error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}

export function isRemoteStoragePath(pathOrUri: string | null | undefined): boolean {
  if (!pathOrUri) return false;
  const v = pathOrUri.trim();
  if (v.startsWith('http') || v.startsWith('file:') || v.startsWith('content:')) return false;
  return v.includes('/') && !v.startsWith('/');
}

/** Web-safe no-op note — storage uploads use fetch+blob which works on native. */
export function mediaUploadSupported() {
  return Platform.OS !== 'web' || isSupabaseConfigured;
}
