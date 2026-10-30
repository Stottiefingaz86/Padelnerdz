/**
 * Chat adapter boundary.
 * Keep Stream (or custom Supabase chat) behind this interface so padel domain
 * logic never imports a vendor SDK directly.
 */
import type { ChatThreadKind } from '@padel-nerdz/domain';

export type ChatChannelRef = {
  id: string;
  kind: ChatThreadKind;
  externalId: string;
};

export type ChatProvider = {
  ensureDirectChannel: (userA: string, userB: string) => Promise<ChatChannelRef>;
  ensureGroupChannel: (groupId: string) => Promise<ChatChannelRef>;
  ensureSessionRoomChannel: (sessionRoomId: string) => Promise<ChatChannelRef>;
};

export const chatProviderName = 'unimplemented' as const;
