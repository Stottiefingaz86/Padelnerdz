import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  AnalyticsEvents,
  identifyUser,
  resetAnalytics,
  track,
} from './analytics';
import {
  clearLocalAccount,
  loadLocalAccount,
  updateLocalAccount,
  upsertLocalAccountFromPhone,
  type LocalAccount,
} from './local-account';
import { getSupabase, isSupabaseConfigured } from './supabase';

export type Profile = {
  id: string;
  display_name: string | null;
  onboarding_completed: boolean;
  phone_e164: string | null;
  avatar_url?: string | null;
};

type AuthState = {
  ready: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  configured: boolean;
  /**
   * No Supabase session, local phone account or guest.
   * Use this for the demo/local data plane (same as former isGuest checks).
   */
  offline: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Explicit throwaway demo (not a real signup). */
  continueAsGuest: (
    displayName: string,
    opts?: { complete?: boolean; avatarUrl?: string | null },
  ) => void;
  /** Phone signup that works without SMS, persists on this device. */
  signUpWithPhoneLocal: (phoneE164: string) => Promise<Profile>;
  /**
   * After verifyOtp, sync session into React state before navigating
   * (avoids index redirecting back to auth on a race).
   */
  adoptSupabaseSession: (session: Session) => Promise<Profile | null>;
  completeLocalProfile: (input: {
    displayName: string;
    avatarUrl?: string | null;
  }) => Promise<Profile>;
  updateGuestProfile: (patch: {
    display_name?: string;
    avatar_url?: string | null;
  }) => void;
};

const AuthContext = createContext<AuthState | null>(null);

function toProfile(account: LocalAccount): Profile {
  return {
    id: account.id,
    display_name: account.display_name,
    onboarding_completed: account.onboarding_completed,
    phone_e164: account.phone_e164,
    avatar_url: account.avatar_url,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [localProfile, setLocalProfile] = useState<Profile | null>(null);

  const fetchProfileRow = useCallback(async (userId: string): Promise<Profile | null> => {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await getSupabase()
      .from('profiles')
      .select('id, display_name, onboarding_completed, phone_e164, avatar_url')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.warn('profile load failed', error.message);
      return null;
    }
    return data as Profile | null;
  }, []);

  const loadProfile = useCallback(
    async (userId: string) => {
      // Trigger creates the row on signup, brief retry if we race it
      let row = await fetchProfileRow(userId);
      if (!row) {
        await new Promise((r) => setTimeout(r, 400));
        row = await fetchProfileRow(userId);
      }
      if (!row) {
        await new Promise((r) => setTimeout(r, 800));
        row = await fetchProfileRow(userId);
      }
      if (row) setProfile(row);
      else setProfile(null);
      return row;
    },
    [fetchProfileRow],
  );

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) {
      await loadProfile(session.user.id);
      return;
    }
    const local = await loadLocalAccount();
    if (local) setLocalProfile(toProfile(local));
  }, [loadProfile, session?.user?.id]);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      // Restore device phone account first (works with or without Supabase SMS)
      try {
        const local = await loadLocalAccount();
        if (mounted && local) setLocalProfile(toProfile(local));
      } catch {
        /* ignore */
      }

      if (!isSupabaseConfigured) {
        if (mounted) setReady(true);
        return;
      }

      const supabase = getSupabase();
      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
        ]);
        if (!mounted) return;
        const nextSession =
          sessionResult && 'data' in sessionResult ? sessionResult.data.session : null;
        setSession(nextSession);
        if (nextSession?.user) {
          await Promise.race([
            loadProfile(nextSession.user.id),
            new Promise<void>((resolve) => setTimeout(resolve, 3000)),
          ]);
        }
      } catch (e) {
        console.warn('auth boot failed', e);
      }
      if (mounted) setReady(true);

      const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
        setSession(next);
        if (next?.user) {
          setLocalProfile(null);
          await loadProfile(next.user.id);
        } else {
          setProfile(null);
        }
      });

      return () => sub.subscription.unsubscribe();
    }

    const cleanupPromise = boot();
    return () => {
      mounted = false;
      void cleanupPromise.then((cleanup) => cleanup?.());
    };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    setLocalProfile(null);
    await clearLocalAccount();
    if (isSupabaseConfigured) {
      await getSupabase().auth.signOut();
    }
    setSession(null);
    setProfile(null);
    resetAnalytics();
  }, []);

  const continueAsGuest = useCallback(
    (displayName: string, opts?: { complete?: boolean; avatarUrl?: string | null }) => {
      void clearLocalAccount();
      setLocalProfile({
        id: 'guest',
        display_name: displayName,
        onboarding_completed: opts?.complete ?? true,
        phone_e164: null,
        avatar_url: opts?.avatarUrl ?? null,
      });
    },
    [],
  );

  const signUpWithPhoneLocal = useCallback(async (phoneE164: string) => {
    const account = await upsertLocalAccountFromPhone(phoneE164);
    const next = toProfile(account);
    setLocalProfile(next);
    identifyUser(next.id, { phone_set: true });
    track(AnalyticsEvents.userSignedUp, { method: 'phone_local' });
    return next;
  }, []);

  const adoptSupabaseSession = useCallback(
    async (nextSession: Session) => {
      setSession(nextSession);
      setLocalProfile(null);
      await clearLocalAccount();
      const userId = nextSession.user?.id;
      if (!userId) {
        setProfile(null);
        return null;
      }
      const row = await loadProfile(userId);
      identifyUser(userId, { phone_set: Boolean(nextSession.user.phone) });
      track(AnalyticsEvents.userSignedUp, { method: 'phone_otp' });
      return row;
    },
    [loadProfile],
  );

  const completeLocalProfile = useCallback(
    async (input: { displayName: string; avatarUrl?: string | null }) => {
      const updated = await updateLocalAccount({
        display_name: input.displayName,
        avatar_url: input.avatarUrl,
        onboarding_completed: true,
      });
      if (!updated) {
        throw new Error('No local account to update');
      }
      const next = toProfile(updated);
      setLocalProfile(next);
      identifyUser(next.id, { display_name: next.display_name });
      track('onboarding_completed');
      return next;
    },
    [],
  );

  const updateGuestProfile = useCallback(
    (patch: { display_name?: string; avatar_url?: string | null }) => {
      setLocalProfile((prev) => {
        if (!prev) return prev;
        if (prev.id === 'guest' || prev.id.startsWith('local_')) {
          const next = {
            ...prev,
            display_name: patch.display_name ?? prev.display_name,
            avatar_url:
              patch.avatar_url !== undefined ? patch.avatar_url : prev.avatar_url,
          };
          if (prev.id.startsWith('local_')) {
            void updateLocalAccount({
              display_name: next.display_name,
              avatar_url: next.avatar_url,
            });
          }
          return next;
        }
        return prev;
      });
    },
    [],
  );

  const activeProfile = session?.user ? profile : localProfile;
  const offline = !session?.user;

  const value = useMemo<AuthState>(
    () => ({
      ready,
      session,
      user: session?.user ?? null,
      profile: activeProfile,
      configured: isSupabaseConfigured,
      offline,
      refreshProfile,
      signOut,
      continueAsGuest,
      signUpWithPhoneLocal,
      adoptSupabaseSession,
      completeLocalProfile,
      updateGuestProfile,
    }),
    [
      ready,
      session,
      profile,
      localProfile,
      activeProfile,
      offline,
      refreshProfile,
      signOut,
      continueAsGuest,
      signUpWithPhoneLocal,
      adoptSupabaseSession,
      completeLocalProfile,
      updateGuestProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Prefer this over `profile?.id === 'guest'` for data-plane routing. */
export function useOfflineMode() {
  return useAuth().offline;
}
