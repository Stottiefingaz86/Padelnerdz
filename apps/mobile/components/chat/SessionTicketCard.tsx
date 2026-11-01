import { colors, radii, spacing } from '@padel-nerdz/config';
import type { FixtureRound } from '@padel-nerdz/domain';
import { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { checkInCode, checkInQrImageUrl } from '@/lib/check-in';

export type TicketPlayer = {
  user_id: string;
  display_name: string;
  status?: string;
  checked_in_at?: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  startsAt: string;
  venue?: string | null;
  format?: string | null;
  courts?: number;
  maxPlayers?: number;
  players: TicketPlayer[];
  fixtures?: FixtureRound | null;
  onOpenFixtures?: () => void;
  viewerUserId?: string | null;
  sessionId?: string | null;
  onAddToCalendar?: () => void;
};

const SHEET_H = Math.min(Dimensions.get('window').height * 0.92, 760);
const DISMISS_Y = 110;
const DISMISS_VY = 1.15;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatLabel(format?: string | null) {
  if (!format) return null;
  if (format === 'tournament_by_wins') return 'Tournament by wins';
  if (format === 'kings_and_queens') return 'Kings & Queens';
  return format.split('_').join(' ');
}

function sideLabel(side: { player_a: { display_name: string }; player_b: { display_name: string } }) {
  return `${side.player_a.display_name} & ${side.player_b.display_name}`;
}

export function SessionTicketCard({
  visible,
  onClose,
  title,
  startsAt,
  venue,
  format,
  courts,
  maxPlayers,
  players,
  fixtures,
  onOpenFixtures,
  viewerUserId,
  sessionId,
  onAddToCalendar,
}: Props) {
  const insets = useSafeAreaInsets();
  const activePlayers = players.filter((p) => p.status !== 'no_show');
  const fmt = formatLabel(format);
  const translateY = useRef(new Animated.Value(SHEET_H)).current;
  const dragBase = useRef(0);
  const scrollY = useRef(0);
  const closing = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const finishClose = useCallback(() => {
    closing.current = false;
    translateY.setValue(SHEET_H);
    onCloseRef.current();
  }, [translateY]);

  const dismiss = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(translateY, {
      toValue: SHEET_H,
      duration: 240,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) finishClose();
      else closing.current = false;
    });
  }, [finishClose, translateY]);

  useEffect(() => {
    if (!visible) {
      closing.current = false;
      translateY.stopAnimation();
      translateY.setValue(SHEET_H);
      scrollY.current = 0;
      return;
    }
    closing.current = false;
    scrollY.current = 0;
    translateY.setValue(SHEET_H);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      damping: 26,
      stiffness: 260,
      mass: 0.85,
      overshootClamping: true,
    }).start();
  }, [visible, translateY]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => {
        if (closing.current) return false;
        const pullingDown = g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx) * 1.2;
        return scrollY.current <= 1 && pullingDown;
      },
      onMoveShouldSetPanResponderCapture: (_, g) => {
        if (closing.current) return false;
        const pullingDown = g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.2;
        return scrollY.current <= 1 && pullingDown;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        translateY.stopAnimation((v) => {
          dragBase.current = typeof v === 'number' ? v : 0;
        });
      },
      onPanResponderMove: (_, g) => {
        translateY.setValue(Math.max(0, dragBase.current + g.dy));
      },
      onPanResponderRelease: (_, g) => {
        const current = Math.max(0, dragBase.current + g.dy);
        if (current > DISMISS_Y || g.vy > DISMISS_VY) {
          dismiss();
          return;
        }
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 26,
          stiffness: 280,
          overshootClamping: true,
        }).start();
      },
    }),
  ).current;

  const handlePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !closing.current,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 2,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        translateY.stopAnimation((v) => {
          dragBase.current = typeof v === 'number' ? v : 0;
        });
      },
      onPanResponderMove: (_, g) => {
        translateY.setValue(Math.max(0, dragBase.current + g.dy));
      },
      onPanResponderRelease: (_, g) => {
        const current = Math.max(0, dragBase.current + g.dy);
        if (current > DISMISS_Y || g.vy > DISMISS_VY) {
          dismiss();
          return;
        }
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 26,
          stiffness: 280,
          overshootClamping: true,
        }).start();
      },
    }),
  ).current;

  const showQr = Boolean(viewerUserId && sessionId);
  const me = activePlayers.find((p) => p.user_id === viewerUserId);
  const checkedIn = Boolean(me?.checked_in_at);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityLabel="Dismiss" />
        <Animated.View
          style={[
            styles.sheet,
            {
              height: SHEET_H,
              paddingBottom: Math.max(insets.bottom, 16),
              transform: [{ translateY }],
            },
          ]}
          {...pan.panHandlers}
        >
          <View style={styles.handleZone} {...handlePan.panHandlers}>
            <View style={styles.handle} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            bounces
            nestedScrollEnabled
            scrollEventThrottle={16}
            onScroll={(e) => {
              scrollY.current = e.nativeEvent.contentOffset.y;
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.ticket}>
              <View style={styles.stub}>
                <View style={styles.stubTop}>
                  <Text style={styles.stubBrand}>PADEL NERDZ</Text>
                  <View style={styles.stubBadge}>
                    <Text style={styles.stubBadgeText}>
                      {checkedIn ? 'CHECKED IN' : 'SESSION'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.stubTitle} numberOfLines={2}>
                  {title}
                </Text>
                <Text style={styles.stubMeta}>
                  {[fmt, courts ? `${courts} court${courts === 1 ? '' : 's'}` : null]
                    .filter(Boolean)
                    .join(' · ') || 'Mix-in'}
                </Text>
              </View>

              <View style={styles.perforation}>
                <View style={styles.notchLeft} />
                <View style={styles.dashRow}>
                  {Array.from({ length: 18 }).map((_, i) => (
                    <View key={i} style={styles.dash} />
                  ))}
                </View>
                <View style={styles.notchRight} />
              </View>

              <View style={styles.face}>
                <View style={styles.grid}>
                  <View style={styles.cell}>
                    <Text style={styles.cellLabel}>DATE</Text>
                    <Text style={styles.cellValue}>{formatDate(startsAt)}</Text>
                  </View>
                  <View style={styles.cell}>
                    <Text style={styles.cellLabel}>TIME</Text>
                    <Text style={styles.cellValue}>{formatTime(startsAt)}</Text>
                  </View>
                  <View style={styles.cell}>
                    <Text style={styles.cellLabel}>PLAYERS</Text>
                    <Text style={styles.cellValue}>
                      {activePlayers.length}
                      {maxPlayers ? `/${maxPlayers}` : ''}
                    </Text>
                  </View>
                </View>

                <View style={styles.locBlock}>
                  <Text style={styles.cellLabel}>LOCATION</Text>
                  <Text style={styles.locValue}>{venue?.trim() || 'Venue TBC'}</Text>
                </View>

                {showQr ? (
                  <View style={styles.qrBlock}>
                    <Text style={styles.cellLabel}>CHECK-IN QR</Text>
                    <Text style={styles.qrHint}>
                      Show this at the courts so the organiser can scan you in.
                    </Text>
                    <View style={styles.qrFrame}>
                      <Image
                        source={{ uri: checkInQrImageUrl(sessionId!, viewerUserId!) }}
                        style={styles.qrImage}
                        accessibilityLabel="Check-in QR code"
                      />
                    </View>
                    <Text style={styles.qrCode}>
                      Code · {checkInCode(sessionId!, viewerUserId!)}
                    </Text>
                    {checkedIn ? (
                      <Text style={styles.checkedIn}>You’re checked in</Text>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.playersBlock}>
                  <Text style={styles.cellLabel}>CONFIRMED PLAYERS</Text>
                  {activePlayers.length === 0 ? (
                    <Text style={styles.emptyPlayers}>Waiting for paid confirmations</Text>
                  ) : (
                    <View style={styles.playerList}>
                      {activePlayers.map((p, i) => (
                        <View key={p.user_id} style={styles.playerRow}>
                          <Text style={styles.seat}>{String(i + 1).padStart(2, '0')}</Text>
                          <Avatar name={p.display_name} size={28} />
                          <Text style={styles.playerName} numberOfLines={1}>
                            {p.display_name}
                          </Text>
                          {p.checked_in_at ? <Text style={styles.inBadge}>In</Text> : null}
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {fixtures && fixtures.matches?.length ? (
                  <View style={styles.fixturesBlock}>
                    <Text style={styles.cellLabel}>FIXTURES · ROUND {fixtures.round}</Text>
                    <View style={styles.matchList}>
                      {fixtures.matches.slice(0, 4).map((m) => (
                        <View key={m.court} style={styles.matchRow}>
                          <Text style={styles.courtTag}>{m.label || `Court ${m.court}`}</Text>
                          <Text style={styles.matchTeams} numberOfLines={2}>
                            {sideLabel(m.team_a)}  vs  {sideLabel(m.team_b)}
                          </Text>
                        </View>
                      ))}
                    </View>
                    {onOpenFixtures ? (
                      <Pressable
                        style={styles.fixturesCta}
                        onPress={() => {
                          dismiss();
                          setTimeout(onOpenFixtures, 260);
                        }}
                      >
                        <Text style={styles.fixturesCtaText}>Open courts & scores</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.fixturesWaiting}>
                    <Text style={styles.fixturesWaitingText}>
                      Courts appear once enough players have paid.
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <Pressable style={styles.closeBtn} onPress={dismiss}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** @deprecated replaced by session action card */
export function SessionEventStrip(_props: {
  startsAt: string;
  venue?: string | null;
  onPress: () => void;
  onAddToCalendar?: () => void;
}) {
  return null;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  handleZone: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 10,
    minHeight: 36,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: 16,
    gap: 12,
  },
  ticket: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.28)',
  },
  stub: {
    backgroundColor: colors.accentGreen,
    paddingHorizontal: spacing.md,
    paddingTop: 18,
    paddingBottom: 20,
    gap: 6,
  },
  stubTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stubBrand: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: 'rgba(11,13,16,0.7)',
  },
  stubBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(11,13,16,0.12)',
  },
  stubBadgeText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#0B0D10',
  },
  stubTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 24,
    letterSpacing: -0.5,
    color: '#0B0D10',
    marginTop: 4,
  },
  stubMeta: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 13,
    color: 'rgba(11,13,16,0.72)',
  },
  perforation: {
    height: 24,
    backgroundColor: colors.elevated,
    justifyContent: 'center',
  },
  dashRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  dash: {
    width: 6,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: colors.border,
  },
  notchLeft: {
    position: 'absolute',
    left: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  notchRight: {
    position: 'absolute',
    right: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  face: {
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    paddingBottom: spacing.md,
    gap: 16,
  },
  grid: { flexDirection: 'row', gap: 10 },
  cell: {
    flex: 1,
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cellLabel: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 10,
    letterSpacing: 0.9,
    color: colors.accentGreen,
  },
  cellValue: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  locBlock: { gap: 4 },
  locValue: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  qrBlock: { gap: 8, alignItems: 'center' },
  qrHint: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    alignSelf: 'stretch',
  },
  qrFrame: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#0B0D10',
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.35)',
  },
  qrImage: { width: 180, height: 180 },
  qrCode: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 16,
    letterSpacing: 2,
    color: colors.textPrimary,
  },
  checkedIn: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 13,
    color: colors.accentGreen,
  },
  playersBlock: { gap: 8, alignSelf: 'stretch' },
  emptyPlayers: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textMuted,
  },
  playerList: { gap: 8 },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  seat: {
    width: 28,
    fontFamily: 'Figtree_700Bold',
    fontSize: 12,
    color: colors.textMuted,
  },
  playerName: {
    flex: 1,
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  inBadge: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 11,
    color: colors.accentGreen,
  },
  fixturesBlock: { gap: 8, alignSelf: 'stretch' },
  matchList: { gap: 8 },
  matchRow: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  courtTag: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 11,
    color: colors.accentGreen,
    letterSpacing: 0.4,
  },
  matchTeams: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 19,
  },
  fixturesCta: {
    marginTop: 4,
    minHeight: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixturesCtaText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 15,
    color: '#0B0D10',
  },
  fixturesWaiting: {
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignSelf: 'stretch',
  },
  fixturesWaitingText: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  closeBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  closeText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 15,
    color: colors.textSecondary,
  },
});
