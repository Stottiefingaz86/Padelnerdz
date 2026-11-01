import { colors, radii, spacing } from '@padel-nerdz/config';
import { useFocusEffect, router } from 'expo-router';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCelebration } from '@/components/CelebrationHost';
import { FlatFilterIcon, FlatLocateIcon } from '@/components/FlatIcons';
import { VisualEmpty } from '@/components/VisualEmpty';
import { useAuth } from '@/lib/auth';
import { presentFreshUnlocks, syncAchievementsFromStats } from '@/lib/achievements';
import { getGuestSkillLevel, subscribeDemoStore } from '@/lib/demo-store';
import { select, success, tap, warn } from '@/lib/feedback';
import {
  formatGroupLevelBand,
  joinGroup,
  listDiscoverableGroups,
  playerMeetsGroupLevel,
  type GroupSummary,
  type OrganiserLevel,
} from '@/lib/groups';
import {
  getCurrentAreaHub,
  hubLabel,
  matchHubQuery,
  nearestHub,
  setCurrentAreaHub,
} from '@/lib/locations';
import { resolveMediaDisplayUrl } from '@/lib/media';

const RADII: { id: number | null; label: string }[] = [
  { id: 5, label: '5 km' },
  { id: 10, label: '10 km' },
  { id: 25, label: '25 km' },
  { id: null, label: 'Any' },
];

const LEVELS: { id: OrganiserLevel | 'all'; label: string }[] = [
  { id: 'all', label: 'Any level' },
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'pro', label: 'Pro' },
];

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { profile, user, offline } = useAuth();
  const { celebrate } = useCelebration();
  const isGuest = offline;
  const userId = user?.id ?? profile?.id ?? '';

  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [coverById, setCoverById] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [radiusKm, setRadiusKm] = useState<number | null>(10);
  const [level, setLevel] = useState<OrganiserLevel | 'all'>('all');
  const [hubId, setHubId] = useState('sotogrande');
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftRadius, setDraftRadius] = useState<number | null>(10);
  const [draftLevel, setDraftLevel] = useState<OrganiserLevel | 'all'>('all');

  const refresh = useCallback(
    async (viewerHub?: string) => {
      if (!userId) return;
      setLoading(true);
      setError(null);
      try {
        const hub = viewerHub ?? (await getCurrentAreaHub());
        setHubId(hub);
        const next = await listDiscoverableGroups(userId, isGuest, hub);
        setGroups(next);
        const covers = await Promise.all(
          next.map(async (g) => {
            const raw = g.cover_url || g.avatar_url;
            return [g.id, await resolveMediaDisplayUrl(raw)] as const;
          }),
        );
        setCoverById(Object.fromEntries(covers));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load discover feed');
      } finally {
        setLoading(false);
      }
    },
    [userId, isGuest],
  );

  const matchedCity = useMemo(() => matchHubQuery(query), [query]);
  const activeHubId = matchedCity?.id ?? hubId;

  useFocusEffect(
    useCallback(() => {
      void refresh(activeHubId);
      if (isGuest) return subscribeDemoStore(() => void refresh(activeHubId));
      return undefined;
    }, [refresh, isGuest, activeHubId]),
  );

  // Keep distances correct when the search resolves to another city hub.
  useEffect(() => {
    if (!userId) return;
    void (async () => {
      const next = await listDiscoverableGroups(userId, isGuest, activeHubId);
      setGroups(next);
      const covers = await Promise.all(
        next.map(async (g) => {
          const raw = g.cover_url || g.avatar_url;
          return [g.id, await resolveMediaDisplayUrl(raw)] as const;
        }),
      );
      setCoverById(Object.fromEntries(covers));
    })();
  }, [activeHubId, userId, isGuest]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const myLevel = isGuest ? getGuestSkillLevel() : 'intermediate';
    const cityHub = matchedCity;
    const hubName = hubLabel(activeHubId).toLowerCase();

    return groups
      .filter((g) => {
        const loc = (g.location_label ?? '').toLowerCase();
        const hay = `${g.name} ${g.location_label ?? ''} ${g.description ?? ''}`.toLowerCase();

        if (cityHub) {
          const inCity =
            loc.includes(cityHub.label.toLowerCase()) ||
            cityHub.aliases.some((a) => loc.includes(a.toLowerCase()));
          if (!inCity) return false;
          // Extra free-text after city name filters names too
          const remainder = q
            .replace(cityHub.label.toLowerCase(), '')
            .replace(/buenas aires|bsas|caba/g, '')
            .trim();
          if (remainder && !hay.includes(remainder)) return false;
        } else if (q) {
          if (!hay.includes(q)) return false;
        } else if (!loc.includes(hubName) && g.distance_miles == null) {
          return false;
        }

        if (radiusKm != null) {
          if (g.distance_miles == null) return false;
          if (g.distance_miles > radiusKm) return false;
        }
        if (level !== 'all') {
          if (!playerMeetsGroupLevel(g.skill_level, level, g.skill_level_max)) return false;
        }
        if (g.skill_level && !playerMeetsGroupLevel(g.skill_level, myLevel, g.skill_level_max)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => (a.distance_miles ?? 99) - (b.distance_miles ?? 99));
  }, [groups, query, radiusKm, level, isGuest, matchedCity, activeHubId]);

  const filtersActive = radiusKm !== 10 || level !== 'all';

  async function onUseMyLocation() {
    void tap();
    setLocating(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is needed to find groups near you.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const hub = nearestHub(pos.coords.latitude, pos.coords.longitude);
      const next = await setCurrentAreaHub(hub.id);
      setHubId(next);
      setQuery(hub.label);
      setGroups(await listDiscoverableGroups(userId, isGuest, next));
    } catch {
      void warn();
      setError('Could not read your location');
    } finally {
      setLocating(false);
    }
  }

  async function onJoin(group: GroupSummary) {
    if (!userId || joiningId) return;
    void tap();
    setJoiningId(group.id);
    try {
      await joinGroup(
        group.id,
        userId,
        isGuest,
        profile?.display_name?.trim() || 'Player',
      );
      const unlocked = await syncAchievementsFromStats({
        mixinsPlayed: 0,
        joinedGroup: true,
      });
      if (unlocked.length) {
        await presentFreshUnlocks(unlocked, celebrate);
      } else {
        celebrate({
          mark: 'G',
          tier: 'bronze',
          title: 'You’re in!',
          body: `Welcome to ${group.name}. Say hi in the chat.`,
        });
      }
      setTimeout(() => router.push(`/group/${group.id}/chat`), 900);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not join';
      if (msg === 'REQUEST_PENDING') {
        void success();
        setError(`Request sent to ${group.name}. An organiser will approve you.`);
      } else {
        void warn();
        setError(msg);
      }
    } finally {
      setJoiningId(null);
    }
  }

  const placeLabel = matchedCity?.label ?? hubLabel(hubId);
  const radiusLabel = radiusKm == null ? 'Any distance' : `within ${radiusKm} km`;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <Pressable
          style={styles.inviteBtn}
          onPress={() => {
            void select();
            router.push('/join');
          }}
        >
          <Text style={styles.inviteBtnText}>Join Group</Text>
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search city or group"
            placeholderTextColor={colors.textMuted}
            cursorColor={colors.accentGreen}
            selectionColor="rgba(200,255,46,0.28)"
            keyboardAppearance="dark"
            underlineColorAndroid="transparent"
            style={styles.search}
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
        </View>
        <Pressable
          style={[styles.iconBtn, locating && styles.iconBtnOn]}
          onPress={() => void onUseMyLocation()}
          accessibilityLabel="Use my location"
        >
          {locating ? (
            <ActivityIndicator color={colors.accentGreen} size="small" />
          ) : (
            <FlatLocateIcon color={colors.accentGreen} size={20} />
          )}
        </Pressable>
        <Pressable
          style={[styles.iconBtn, filtersActive && styles.iconBtnOn]}
          onPress={() => {
            void select();
            setDraftRadius(radiusKm);
            setDraftLevel(level);
            setFiltersOpen(true);
          }}
          accessibilityLabel="Filters"
        >
          <FlatFilterIcon
            color={filtersActive ? colors.accentGreen : colors.textSecondary}
            size={20}
          />
        </Pressable>
      </View>

      <Text style={styles.context}>
        Near {placeLabel} · {radiusLabel}
      </Text>

      {filtersActive ? (
        <View style={styles.activeFilters}>
          {radiusKm !== 10 ? (
            <Pressable
              style={styles.pill}
              onPress={() => {
                void select();
                setRadiusKm(10);
              }}
            >
              <Text style={styles.pillText}>{radiusKm == null ? 'Any km' : `${radiusKm} km`} ×</Text>
            </Pressable>
          ) : null}
          {level !== 'all' ? (
            <Pressable
              style={styles.pill}
              onPress={() => {
                void select();
                setLevel('all');
              }}
            >
              <Text style={styles.pillText}>
                {LEVELS.find((l) => l.id === level)?.label} ×
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.accentGreen} style={{ marginTop: 12 }} /> : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24,
          paddingTop: 4,
          flexGrow: filtered.length === 0 ? 1 : undefined,
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={{ paddingHorizontal: spacing.lg, flex: 1, justifyContent: 'center' }}>
              <VisualEmpty
                image={require('../../assets/images/empty/discover-hero.jpg')}
                imageFit="cover"
                heroAspectRatio={16 / 9}
                kicker="NEAR YOU"
                title="No groups here"
                body="Try another city (Madrid, Buenos Aires…), widen the radius, or create a public group."
                actions={[
                  {
                    label: 'Create a public group',
                    primary: true,
                    onPress: () => {
                      void tap();
                      router.push('/group/create');
                    },
                  },
                  {
                    label: 'Clear search & filters',
                    onPress: () => {
                      void select();
                      setQuery('');
                      setRadiusKm(10);
                      setLevel('all');
                      void refresh(activeHubId);
                    },
                  },
                ]}
              />
            </View>
          ) : (
            <View />
          )
        }
        renderItem={({ item }) => {
          const cta = item.visibility === 'approval' ? 'Request to join' : 'Join Group';
          const milesLabel =
            item.distance_miles != null ? `${item.distance_miles.toFixed(1)} km` : null;
          const coverUri = coverById[item.id];
          return (
            <Pressable
              style={styles.card}
              onPress={() => {
                void select();
                router.push(`/group/${item.id}`);
              }}
            >
              <View style={styles.cardMedia}>
                {coverUri ? (
                  <Image
                    source={{ uri: coverUri }}
                    style={styles.cardCover}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.cardCoverFallback}>
                    <Text style={styles.cardCoverInitial}>
                      {item.name.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.cardMeta} numberOfLines={2}>
                  {[
                    formatGroupLevelBand(item.skill_level, item.skill_level_max),
                    milesLabel,
                    item.location_label,
                    `${item.member_count} members`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                {item.description ? (
                  <Text style={styles.cardDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
                <Pressable
                  style={styles.joinBtn}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    void onJoin(item);
                  }}
                >
                  <Text style={styles.joinBtnText}>{joiningId === item.id ? '…' : cta}</Text>
                </Pressable>
              </View>
            </Pressable>
          );
        }}
      />

      <Modal
        visible={filtersOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setFiltersOpen(false)}
      >
        <Pressable style={styles.sheetScrim} onPress={() => setFiltersOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={(e) => e.stopPropagation?.()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Filters</Text>

            <Text style={styles.sheetLabel}>Distance from location</Text>
            <View style={styles.sheetRow}>
              {RADII.map((item) => {
                const on = draftRadius === item.id;
                return (
                  <Pressable
                    key={item.label}
                    onPress={() => {
                      void select();
                      setDraftRadius(item.id);
                    }}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sheetLabel}>Level</Text>
            <View style={styles.sheetRow}>
              {LEVELS.map((item) => {
                const on = draftLevel === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      void select();
                      setDraftLevel(item.id);
                    }}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={styles.applyBtn}
              onPress={() => {
                void tap();
                setRadiusKm(draftRadius);
                setLevel(draftLevel);
                setFiltersOpen(false);
              }}
            >
              <Text style={styles.applyBtnText}>Apply</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 34,
    letterSpacing: -1,
    color: colors.textPrimary,
  },
  inviteBtn: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: colors.accentGreenDim,
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  inviteBtnText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 13,
    color: colors.accentGreen,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingBottom: 8,
  },
  searchWrap: { flex: 1 },
  search: {
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.elevated,
    color: colors.textPrimary,
    fontFamily: 'Figtree_400Regular',
    fontSize: 16,
  },
  iconBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnOn: {
    backgroundColor: colors.accentGreenDim,
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.35)',
  },
  context: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    marginBottom: 8,
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: spacing.md,
    marginBottom: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.accentGreenDim,
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.35)',
  },
  pillText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 12,
    color: colors.accentGreen,
  },
  card: {
    marginHorizontal: spacing.md,
    marginBottom: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  cardMedia: {
    width: '100%',
    height: 148,
    backgroundColor: colors.elevated,
  },
  cardCover: {
    width: '100%',
    height: '100%',
  },
  cardCoverFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F3A2E',
  },
  cardCoverInitial: {
    fontFamily: 'Figtree_700Bold',
    color: colors.accentGreen,
    fontSize: 36,
  },
  cardBody: {
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    fontFamily: 'Figtree_700Bold',
    color: colors.textPrimary,
    fontSize: 17,
  },
  cardMeta: {
    fontFamily: 'Figtree_400Regular',
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  cardDesc: {
    fontFamily: 'Figtree_400Regular',
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  joinBtn: {
    minHeight: 44,
    marginTop: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtnText: {
    fontFamily: 'Figtree_700Bold',
    color: '#0B0D10',
    fontSize: 15,
  },
  error: {
    color: colors.error,
    paddingHorizontal: spacing.md,
    marginBottom: 8,
  },
  sheetScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    gap: 12,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 4,
  },
  sheetTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 20,
    color: colors.textPrimary,
  },
  sheetLabel: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  sheetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.elevated,
  },
  chipOn: {
    backgroundColor: colors.accentGreenDim,
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.35)',
  },
  chipText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 12,
    color: colors.textSecondary,
  },
  chipTextOn: { color: colors.accentGreen },
  applyBtn: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 16,
    color: '#0B0D10',
  },
});
