import { colors, radii, spacing } from '@padel-nerdz/config';
import { Screen } from '@padel-nerdz/ui';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppButton } from '@/components/AppButton';
import { BrandLogo } from '@/components/BrandLogo';
import { useCelebration } from '@/components/CelebrationHost';
import { LevelRangePicker, type LevelRange } from '@/components/LevelRangePicker';
import { MedalBadge } from '@/components/MedalBadge';
import { WinLossSparkline } from '@/components/WinLossSparkline';
import { useAuth } from '@/lib/auth';
import {
  listAchievements,
  presentFreshUnlocks,
  syncAchievementsFromStats,
  type MissionProgress,
} from '@/lib/achievements';
import {
  getGuestAvatarUrl,
  getGuestSkillLevel,
  setGuestAvatarUrl,
  setGuestSkillLevel,
  subscribeDemoStore,
} from '@/lib/demo-store';
import { select, success, tap } from '@/lib/feedback';
import { subscribeFriends } from '@/lib/friends';
import { levelLabel, type OrganiserLevel } from '@/lib/groups';
import { getOverallPlayerStats, type OverallPlayerStats } from '@/lib/player-stats';
import {
  listMyMixinHistory,
  type MixinHistoryItem,
} from '@/lib/sessions';

export default function ProfileScreen() {
  const { profile, configured, signOut, updateGuestProfile , offline } = useAuth();
  const { celebrate } = useCelebration();
  const isGuest = offline;
  const userId = profile?.id ?? '';
  const initial = (profile?.display_name ?? 'P').slice(0, 1).toUpperCase();

  const [avatarUri, setAvatarUri] = useState<string | null>(
    profile?.avatar_url ?? (isGuest ? getGuestAvatarUrl() : null),
  );
  const [claimed, setClaimed] = useState<OrganiserLevel>(
    isGuest ? getGuestSkillLevel() : 'intermediate',
  );
  const [stats, setStats] = useState<OverallPlayerStats | null>(null);
  const [achievements, setAchievements] = useState<MissionProgress[]>([]);
  const [history, setHistory] = useState<MixinHistoryItem[]>([]);
  const refresh = useCallback(async () => {
    if (!userId) return;
    const nextStats = await getOverallPlayerStats(userId, isGuest);
    setStats(nextStats);
    const hist = await listMyMixinHistory(userId, isGuest);
    setHistory(hist);
    const fresh = await syncAchievementsFromStats({
      mixinsPlayed: Math.max(nextStats.sessionsPlayed, hist.length),
      groupRank: nextStats.bestFinish === 1 ? 1 : null,
      isWinner: nextStats.bestFinish === 1,
      improved: Boolean(nextStats.suggestion?.toLowerCase().includes('outperforming')),
    });
    if (fresh.length) {
      void presentFreshUnlocks(fresh, celebrate);
    }
    setAchievements(await listAchievements());
    if (isGuest) {
      setClaimed(getGuestSkillLevel());
      setAvatarUri(getGuestAvatarUrl() ?? profile?.avatar_url ?? null);
    }
  }, [userId, isGuest, profile?.avatar_url, celebrate]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      const unsubFriends = subscribeFriends(() => void refresh());
      const unsubDemo = isGuest ? subscribeDemoStore(() => void refresh()) : undefined;
      return () => {
        unsubFriends();
        unsubDemo?.();
      };
    }, [refresh, isGuest]),
  );

  async function pickAvatar() {
    void tap();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const uri = result.assets[0].uri;
    setAvatarUri(uri);
    if (isGuest) {
      setGuestAvatarUrl(uri);
      updateGuestProfile({ avatar_url: uri });
    }
    void success();
  }

  function onClaimLevel(choice: LevelRange | 'all' | null) {
    if (!choice || choice === 'all') return;
    const level = choice.min;
    setClaimed(level);
    if (isGuest) setGuestSkillLevel(level);
    void success();
    void refresh();
  }

  const claimedRange: LevelRange | null =
    claimed !== 'unknown' ? { min: claimed, max: claimed } : null;

  const games = stats?.games ?? 0;
  const wins = stats?.wins ?? 0;
  const losses = stats?.losses ?? 0;
  const winPct = stats?.winPct ?? 0;
  const form = stats?.formSeries ?? [];
  const [selectedForm, setSelectedForm] = useState<number | null>(null);
  const selectedResult =
    selectedForm != null && form[selectedForm] != null
      ? { index: selectedForm, win: form[selectedForm]! >= 0.5 }
      : null;

  return (
    <Screen scroll contentStyle={styles.content}>
      <Animated.View entering={FadeInDown.duration(280)} style={styles.topBar}>
        <BrandLogo size="md" />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(40).duration(280)} style={styles.heroCard}>
        <LinearGradient
          colors={['rgba(200,255,46,0.12)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={styles.identityRow}>
          <Pressable onPress={() => void pickAvatar()} style={styles.avatarWrap}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Text style={styles.avatarBadgeText}>EDIT</Text>
            </View>
          </Pressable>

          <View style={styles.identityCopy}>
            <Text style={styles.kicker}>PLAYER</Text>
            <Text style={styles.name} numberOfLines={1}>
              {profile?.display_name ?? 'Player'}
            </Text>
            <Text style={styles.meta} numberOfLines={2}>
              {configured
                ? (profile?.phone_e164 ?? 'Phone linked when SMS is enabled')
                : 'Demo mode, OTP goes live once SMS is enabled'}
            </Text>
            <View style={styles.levelRow}>
              <View style={styles.levelPill}>
                <Text style={styles.levelPillLabel}>I play as</Text>
                <Text style={styles.levelPillValue}>{levelLabel(claimed)}</Text>
              </View>
              {stats?.performanceLevel && stats.performanceLevel !== 'unknown' ? (
                <View style={[styles.levelPill, styles.levelPillAlt]}>
                  <Text style={styles.levelPillLabel}>Results say</Text>
                  <Text style={styles.levelPillValue}>{levelLabel(stats.performanceLevel)}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.headlineStats}>
          <HeadlineStat value={String(games)} label="Games" />
          <View style={styles.headlineDivider} />
          <HeadlineStat value={`${wins}–${losses}`} label="W–L" />
          <View style={styles.headlineDivider} />
          <HeadlineStat value={`${winPct}%`} label="Win rate" accent />
        </View>

        <View style={styles.chartBlock}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Form</Text>
            <Text style={styles.chartMeta}>
              {form.length === 0
                ? 'After your first games'
                : selectedResult
                  ? `Game ${selectedResult.index + 1} · ${selectedResult.win ? 'Win' : 'Loss'}`
                  : `Rolling win rate · ${form.length} games`}
            </Text>
          </View>
          <WinLossSparkline
            series={form}
            height={100}
            selectedIndex={selectedForm}
            onSelectIndex={setSelectedForm}
          />
          {form.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator
              contentContainerStyle={styles.formStrip}
            >
              {form.map((v, i) => {
                const on = selectedForm === i;
                return (
                  <Pressable
                    key={`f-${i}`}
                    onPress={() => {
                      void select();
                      setSelectedForm(i);
                    }}
                    style={[
                      styles.formChip,
                      v >= 0.5 ? styles.formWin : styles.formLoss,
                      on && styles.formChipOn,
                    ]}
                  >
                    <Text style={styles.formChipIndex}>{i + 1}</Text>
                    <Text style={[styles.formChipText, v >= 0.5 ? styles.formWinText : null]}>
                      {v >= 0.5 ? 'W' : 'L'}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(70).duration(280)} style={styles.statsCard}>
        <Text style={styles.sectionTitle}>Across groups</Text>
        <View style={styles.statGrid}>
          <Stat label="Groups" value={String(stats?.groupsCount ?? 0)} />
          <Stat label="Mix-ins" value={String(stats?.sessionsPlayed ?? 0)} />
          <Stat label="Points" value={String(stats?.points ?? 0)} />
          <Stat
            label="Reliability"
            value={stats?.reliability == null ? '-' : `${stats.reliability}%`}
          />
          <Stat
            label="Best finish"
            value={stats?.bestFinish != null ? `#${stats.bestFinish}` : '-'}
          />
          <Stat label="No-shows" value={String(stats?.noShows ?? 0)} />
        </View>
        {stats?.suggestion ? (
          <Pressable
            style={styles.suggestion}
            onPress={() => {
              void select();
            }}
          >
            <Text style={styles.suggestionKicker}>LEVEL CHECK</Text>
            <Text style={styles.suggestionBody}>{stats.suggestion}</Text>
          </Pressable>
        ) : null}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(90).duration(280)} style={styles.statsCard}>
        <Text style={styles.sectionTitle}>Missions</Text>
        <Text style={styles.journeySub}>
          Medals for firsts, volume, wins, hosting, and reliability, progress as you play.
        </Text>
        <View style={styles.achieveGrid}>
          {achievements.map((a) => {
            const on = Boolean(a.unlockedAt);
            return (
              <View key={a.id} style={[styles.achieve, !on && styles.achieveLocked]}>
                <MedalBadge
                  mark={a.mark}
                  tier={a.tier}
                  unlocked={on}
                  size="md"
                  achievementId={a.id}
                />
                <Text style={[styles.achieveTitle, !on && styles.achieveMuted]} numberOfLines={2}>
                  {a.title}
                </Text>
                {!on ? (
                  <View style={styles.progressTrack}>
                    <View
                      style={[styles.progressFill, { width: `${Math.round(a.progress * 100)}%` }]}
                    />
                  </View>
                ) : (
                  <Text style={styles.progressDone}>Unlocked</Text>
                )}
                {!on ? (
                  <Text style={styles.progressLabel}>
                    {a.current}/{a.target}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(280)} style={styles.statsCard}>
        <Text style={styles.sectionTitle}>Mix-in history</Text>
        <Text style={styles.journeySub}>
          Every session you’ve been part of, open the room to relive chat & memories.
        </Text>
        {history.length === 0 ? (
          <View style={styles.historyEmpty}>
            <Text style={styles.historyEmptyText}>
              No mix-ins yet. Register interest, get selected, and your journey starts here.
            </Text>
          </View>
        ) : (
          history.map((item) => {
            const canOpen = Boolean(item.session_room_id);
            return (
              <Pressable
                key={item.session_id}
                style={styles.historyRow}
                onPress={() => {
                  void select();
                  if (canOpen) {
                    router.push(
                      `/group/${item.group_id}/session-room/${item.session_room_id}`,
                    );
                  } else {
                    router.push(`/group/${item.group_id}/session/${item.session_id}`);
                  }
                }}
              >
                <View style={styles.historyCopy}>
                  <Text style={styles.historyTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.historyMeta} numberOfLines={1}>
                    {new Date(item.starts_at).toLocaleString()}
                    {item.venue_label ? ` · ${item.venue_label}` : ''}
                    {` · ${item.status.replace('_', ' ')}`}
                  </Text>
                </View>
                <Text style={styles.historyCta}>{canOpen ? 'Memories' : 'Open'}</Text>
              </Pressable>
            );
          })
        )}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(110).duration(280)} style={styles.section}>
        <LevelRangePicker
          single
          label="Your level"
          help="What you think you are. We’ll compare this to your results across groups."
          value={claimedRange}
          onChange={onClaimLevel}
        />
      </Animated.View>

      <AppButton
        label="Privacy & account"
        variant="secondary"
        onPress={() => {
          void tap();
          router.push('/privacy-settings');
        }}
      />

      {isGuest ? (
        <AppButton
          label="Create account with phone"
          onPress={async () => {
            void success();
            await signOut();
            router.replace('/(auth)/phone');
          }}
        />
      ) : null}

      <AppButton
        label="Sign out"
        variant="secondary"
        onPress={async () => {
          void success();
          await signOut();
          router.replace('/');
        }}
      />
    </Screen>
  );
}

function HeadlineStat({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.headlineStat}>
      <Text style={[styles.headlineValue, accent ? styles.headlineValueAccent : null]}>{value}</Text>
      <Text style={styles.headlineLabel}>{label}</Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  topBar: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.sm,
  },
  heroCard: {
    backgroundColor: colors.elevated,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.18)',
    padding: spacing.lg,
    gap: spacing.lg,
    overflow: 'hidden',
  },
  identityRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  avatarWrap: { position: 'relative' },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.elevated2,
    borderWidth: 2,
    borderColor: colors.accentGreen,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 28,
    color: colors.background,
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    backgroundColor: colors.background,
    borderRadius: radii.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.accentGreen,
  },
  avatarBadgeText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 8,
    letterSpacing: 0.6,
    color: colors.accentGreen,
  },
  identityCopy: { flex: 1, gap: 4, minWidth: 0 },
  kicker: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.accentGreen,
  },
  name: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 26,
    letterSpacing: -0.7,
    color: colors.textPrimary,
  },
  meta: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  levelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  levelPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.md,
    backgroundColor: colors.accentGreenDim,
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.35)',
    gap: 1,
  },
  levelPillAlt: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
  },
  levelPillLabel: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  levelPillValue: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 13,
    color: colors.textPrimary,
  },
  headlineStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  headlineStat: { flex: 1, alignItems: 'center', gap: 2 },
  headlineDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
  headlineValue: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 24,
    letterSpacing: -0.5,
    color: colors.textPrimary,
  },
  headlineValueAccent: { color: colors.accentGreen },
  headlineLabel: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chartBlock: { gap: 10 },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  chartTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 14,
    color: colors.textPrimary,
  },
  chartMeta: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 11,
    color: colors.textMuted,
  },
  formStrip: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  formChip: {
    minWidth: 36,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    gap: 1,
  },
  formChipOn: {
    borderColor: colors.textPrimary,
    borderWidth: 1.5,
  },
  formWin: {
    backgroundColor: colors.accentGreenDim,
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.4)',
  },
  formLoss: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formChipIndex: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 9,
    color: colors.textMuted,
  },
  formChipText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 12,
    color: colors.textMuted,
  },
  formWinText: { color: colors.accentGreen },
  section: { gap: spacing.sm },
  sectionTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 16,
    color: colors.textPrimary,
  },
  statsCard: {
    backgroundColor: colors.elevated,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
    gap: spacing.md,
  },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: {
    width: '30%',
    flexGrow: 1,
    minWidth: 96,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 12,
    gap: 2,
  },
  statValue: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 18,
    color: colors.textPrimary,
  },
  statLabel: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 11,
    color: colors.textMuted,
  },
  suggestion: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  suggestionKicker: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.accentGreen,
  },
  suggestionBody: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  journeySub: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: -4,
  },
  achieveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  achieve: {
    width: '30%',
    flexGrow: 1,
    minWidth: 96,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.3)',
    alignItems: 'center',
  },
  achieveLocked: {
    borderColor: colors.borderSubtle,
    opacity: 0.92,
  },
  achieveTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 11,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  achieveMuted: { color: colors.textMuted },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accentGreen,
    borderRadius: 2,
  },
  progressLabel: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 10,
    color: colors.textMuted,
  },
  progressDone: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 10,
    color: colors.accentGreen,
  },
  historyEmpty: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  historyEmptyText: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  historyCopy: { flex: 1, gap: 2, minWidth: 0 },
  historyTitle: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  historyMeta: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 12,
    color: colors.textMuted,
  },
  historyCta: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 12,
    color: colors.accentGreen,
  },
});
