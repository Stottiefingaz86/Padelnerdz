import * as FileSystem from 'expo-file-system/legacy';
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

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = globalThis.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * React Native cannot reliably build Blob from ArrayBuffer (`new Blob([ab])` throws).
 * Always hand Supabase a Uint8Array (or a properly typed Blob on web).
 */
async function readLocalBytes(localUri: string): Promise<Uint8Array> {
  if (Platform.OS !== 'web') {
    try {
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (base64?.length) return base64ToUint8Array(base64);
    } catch {
      /* fall through to fetch */
    }
  }

  const response = await fetch(localUri);
  if (!response.ok) throw new Error('Could not read media file');
  const buf = await response.arrayBuffer();
  if (!buf.byteLength) throw new Error('Media file was empty');
  return new Uint8Array(buf);
}

/**
 * Upload a group avatar or banner.
 * Path: `{userId}/groups/{groupId}/{kind}-{ts}.jpg` (matches chat-media RLS).
 * Stores a storage path in DB; use `resolveMediaDisplayUrl` when rendering.
 */
export async function uploadGroupImage(input: {
  userId: string;
  groupId: string;
  localUri: string;
  kind: 'avatar' | 'cover';
  mimeType?: string | null;
}): Promise<{ path: string; signedUrl: string }> {
  if (!isSupabaseConfigured) {
    return { path: input.localUri, signedUrl: input.localUri };
  }

  const ext = extFromMime(input.mimeType, 'jpg');
  const path = `${input.userId}/groups/${input.groupId}/${input.kind}-${Date.now()}.${ext}`;
  const contentType =
    input.mimeType && input.mimeType.startsWith('image/')
      ? input.mimeType
      : 'image/jpeg';
  const bytes = await readLocalBytes(input.localUri);

  const { error } = await getSupabaseLoose().storage.from(BUCKET).upload(path, bytes, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(error.message || 'Upload failed');

  const signedUrl = await createSignedMediaUrl(path);
  return { path, signedUrl: signedUrl || input.localUri };
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
    input.mimeType &&
    input.mimeType !== 'text/plain' &&
    input.mimeType !== 'application/octet-stream'
      ? input.mimeType
      : input.kind === 'video'
        ? 'video/mp4'
        : 'image/jpeg';

  const bytes = await readLocalBytes(input.localUri);

  const { error } = await getSupabaseLoose().storage.from(BUCKET).upload(path, bytes, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(error.message || 'Upload failed');

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
