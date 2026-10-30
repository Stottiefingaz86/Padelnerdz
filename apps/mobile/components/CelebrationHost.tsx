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
import { celebratePulse } from '@/lib/feedback';

type Celebration = {
  title: string;
  body?: string;
  /** Short brand mark (no emoji). */
  mark?: string;
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
    hideTimer.current = setTimeout(() => setActive(null), 3200);
  }, []);

  const value = useMemo(() => ({ celebrate }), [celebrate]);

  return (
    <CelebrationContext.Provider value={value}>
      {children}
      <Modal visible={Boolean(active)} transparent animationType="fade" statusBarTranslucent>
        <Pressable style={styles.backdrop} onPress={() => setActive(null)}>
          {active ? <ConfettiBurst /> : null}
          {active ? (
            <Animated.View entering={ZoomIn.duration(280)} exiting={FadeOut} style={styles.card}>
              <Animated.View entering={FadeIn.delay(80)} style={styles.markWrap}>
                <Text style={styles.mark}>{active.mark ?? active.emoji ?? 'PN'}</Text>
              </Animated.View>
              <Text style={styles.title}>{active.title}</Text>
              {active.body ? <Text style={styles.body}>{active.body}</Text> : null}
              <Text style={styles.hint}>Tap anywhere</Text>
            </Animated.View>
          ) : null}
        </Pressable>
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
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
  markWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    backgroundColor: 'rgba(200,255,46,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.4)',
  },
  mark: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 22,
    letterSpacing: 0.4,
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
