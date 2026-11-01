import { colors } from '@padel-nerdz/config';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

import { ConfettiBurst } from '@/components/ConfettiBurst';
import { MedalBadge } from '@/components/MedalBadge';
import type { MissionTier } from '@/lib/achievements';
import { celebratePulse } from '@/lib/feedback';

type Celebration = {
  title: string;
  body?: string;
  /** Short brand mark on the medal */
  mark?: string;
  tier?: MissionTier;
  achievementId?: string;
  /** @deprecated use mark */
  emoji?: string;
};

type Ctx = {
  celebrate: (input: Celebration) => void;
};

const CelebrationContext = createContext<Ctx | null>(null);

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<Celebration | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const celebrate = useCallback((input: Celebration) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setActive(input);
    void celebratePulse();
    hideTimer.current = setTimeout(() => setActive(null), 4200);
  }, []);

  const value = useMemo(() => ({ celebrate }), [celebrate]);

  return (
    <CelebrationContext.Provider value={value}>
      {children}
      <Modal visible={Boolean(active)} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.root}>
          <Pressable style={styles.backdrop} onPress={() => setActive(null)}>
            {active ? (
              <Animated.View
                entering={ZoomIn.duration(280)}
                exiting={FadeOut}
                style={styles.card}
              >
                <Animated.View entering={FadeIn.delay(80)} style={styles.medalWrap}>
                  <MedalBadge
                    mark={active.mark ?? active.emoji ?? 'PN'}
                    tier={active.tier ?? 'gold'}
                    unlocked
                    size="hero"
                    achievementId={active.achievementId}
                  />
                </Animated.View>
                <Text style={styles.kicker}>MISSION UNLOCKED</Text>
                <Text style={styles.title}>{active.title}</Text>
                {active.body ? <Text style={styles.body}>{active.body}</Text> : null}
                <Text style={styles.hint}>Tap anywhere</Text>
              </Animated.View>
            ) : null}
          </Pressable>
          {active ? (
            <View pointerEvents="none" style={styles.confettiLayer}>
              <ConfettiBurst count={140} />
            </View>
          ) : null}
        </View>
      </Modal>
    </CelebrationContext.Provider>
  );
}

export function useCelebration() {
  const ctx = useContext(CelebrationContext);
  if (!ctx) {
    return {
      celebrate: (_input: Celebration) => {
        /* no-op outside provider */
      },
    };
  }
  return ctx;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  confettiLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
    elevation: 20,
  },
  card: {
    backgroundColor: colors.elevated,
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.35)',
    maxWidth: 340,
    width: '100%',
  },
  medalWrap: {
    marginBottom: 8,
  },
  kicker: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.accentGreen,
  },
  title: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 24,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  body: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  hint: {
    marginTop: 10,
    fontFamily: 'Figtree_500Medium',
    fontSize: 12,
    color: colors.textMuted,
  },
});
