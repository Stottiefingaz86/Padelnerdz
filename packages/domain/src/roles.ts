export const GROUP_VISIBILITIES = ['public', 'approval', 'private'] as const;
export type GroupVisibility = (typeof GROUP_VISIBILITIES)[number];

export const GROUP_ROLES = ['owner', 'admin', 'organiser', 'member'] as const;
export type GroupRole = (typeof GROUP_ROLES)[number];

export const SESSION_FORMATS = [
  'kings_and_queens',
  'americano',
  'mexicano',
  'tournament_by_wins',
  'custom',
] as const;
export type SessionFormat = (typeof SESSION_FORMATS)[number];

export const ORGANISER_ROLES: GroupRole[] = ['owner', 'admin', 'organiser'];

export function canManageSession(role: GroupRole): boolean {
  return ORGANISER_ROLES.includes(role);
}
