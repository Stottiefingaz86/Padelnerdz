import type { GroupRole, GroupVisibility, SessionFormat } from './roles';

export type UserProfile = {
  id: string;
  phoneE164: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  level: number | null;
  createdAt: string;
  updatedAt: string;
};

export type Group = {
  id: string;
  name: string;
  description: string | null;
  visibility: GroupVisibility;
  coverUrl: string | null;
  locationLabel: string | null;
  latitude: number | null;
  longitude: number | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type Membership = {
  id: string;
  groupId: string;
  userId: string;
  role: GroupRole;
  joinedAt: string;
};

export type Session = {
  id: string;
  groupId: string;
  title: string;
  startsAt: string;
  venueLabel: string | null;
  format: SessionFormat;
  courts: number;
  maxPlayers: number;
  priceCents: number | null;
  currency: string;
  createdBy: string;
  createdAt: string;
};

/** Private event space — only selected players + organisers. */
export type SessionRoom = {
  id: string;
  sessionId: string;
  chatChannelId: string | null;
  createdAt: string;
};

export type ChatThreadKind = 'direct' | 'group' | 'session_room';

export type ChatThreadSummary = {
  id: string;
  kind: ChatThreadKind;
  title: string;
  subtitle: string | null;
  unreadCount: number;
  updatedAt: string;
};
