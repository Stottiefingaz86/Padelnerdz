import { AppButton } from '@/components/AppButton';
import type { GroupVisibility } from '@padel-nerdz/domain';
import { colors, radii, spacing, typography } from '@padel-nerdz/config';
import { Screen, TextField } from '@padel-nerdz/ui';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { LevelRangePicker, type LevelRange } from '@/components/LevelRangePicker';
import { VisibilityPicker } from '@/components/VisibilityPicker';
import { useAuth } from '@/lib/auth';
import { listFriends, type Friend } from '@/lib/friends';
import { createGroup } from '@/lib/groups';
import { AREA_HUBS } from '@/lib/locations';
import { select, tap } from '@/lib/feedback';

function describeError(e: unknown): string {
  if (e instanceof Error && e.message.trim()) return e.message;
  if (e && typeof e === 'object') {
    const row = e as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [row.message, row.details, row.hint].filter(
      (p): p is string => typeof p === 'string' && p.trim().length > 0,
    );
    if (parts.length) return parts.join(' — ');
    if (row.code) return `Could not create group (${row.code})`;
  }
  return 'Could not create group — try again or sign out and back in';
}

export default function CreateGroupScreen() {
  const { profile, user, offline } = useAuth();
  const isGuest = offline;
  const userId = user?.id ?? profile?.id ?? '';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('Sotogrande');
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<GroupVisibility>('private');
  const [levelRange, setLevelRange] = useState<LevelRange | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [inviteIds, setInviteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const needsLevel = visibility === 'public' || visibility === 'approval';

  useEffect(() => {
    void listFriends().then(setFriends);
  }, []);

  async function pickCover() {
    void tap();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Allow photos to set a group avatar');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setCoverUri(result.assets[0].uri);
      if (error) setError(undefined);
    }
  }

  function toggleFriend(id: string) {
    void select();
    setInviteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onCreate() {
    setError(undefined);
    if (name.trim().length < 2) {
      setError('Group name needs at least 2 characters');
      return;
    }
    if (needsLevel && !levelRange) {
      setError('Choose who can join (you can pick a band like Beginner–Intermediate)');
      return;
    }
    if (!userId) {
      Alert.alert('Sign in required', 'Create an account to save groups.');
      return;
    }

    setLoading(true);
    try {
      // Local file:// URIs aren't hosted yet — keep on device for demo, skip for live inserts.
      const coverForApi =
        coverUri && (isGuest || coverUri.startsWith('http')) ? coverUri : null;

      const group = await createGroup(userId, isGuest, {
        name,
        description,
        visibility,
        location_label: location,
        skill_level: needsLevel ? levelRange?.min ?? null : null,
        skill_level_max: needsLevel ? levelRange?.max ?? null : null,
        cover_url: coverForApi ?? (isGuest ? coverUri : null),
        ownerName: profile?.display_name?.trim() || 'You',
        inviteFriendIds: Array.from(inviteIds),
      });
      router.replace(`/group/${group.id}`);
    } catch (e) {
      const msg = describeError(e);
      setError(msg);
      Alert.alert('Couldn’t create group', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll edges={['left', 'right', 'bottom']} contentStyle={styles.content}>
      <Text style={styles.intro}>
        Permanent community space. Mix-in session rooms stay separate so non-selected players are not
        flooded.
      </Text>

      <Pressable style={styles.coverPick} onPress={() => void pickCover()}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverEmpty}>
            <Text style={styles.coverPlus}>+</Text>
          </View>
        )}
        <Text style={styles.coverHint}>
          {coverUri ? 'Change group avatar' : 'Add group avatar'}
        </Text>
      </Pressable>

      <TextField
        label="Group name"
        value={name}
        onChangeText={setName}
        placeholder="Thursday Night Padel"
        autoFocus
        error={error && !error.toLowerCase().includes('level') ? error : undefined}
      />
      <TextField
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Friendly competitive mix-ins"
        multiline
        style={styles.multiline}
      />

      <Text style={styles.label}>Area</Text>
      <Text style={styles.help}>
        Home base is South Spain — switch when you travel (Madrid, London, …).
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hubRow}
      >
        {AREA_HUBS.map((hub) => {
          const on = location.toLowerCase().includes(hub.label.toLowerCase());
          return (
            <Pressable
              key={hub.id}
              onPress={() => {
                void select();
                setLocation(hub.label);
              }}
              style={[styles.hubChip, on && styles.hubChipOn]}
            >
              <Text style={[styles.hubText, on && styles.hubTextOn]}>{hub.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <TextField
        label="Or type a place"
        value={location}
        onChangeText={setLocation}
        placeholder="Sotogrande"
      />

      <VisibilityPicker
        value={visibility}
        onChange={(next) => {
          setVisibility(next);
          if (next === 'private') setLevelRange(null);
        }}
      />
      {needsLevel ? (
        <LevelRangePicker
          value={levelRange}
          required
          onChange={setLevelRange}
          label="Who can join"
          help="Tap one level, or two ends for a band — e.g. Beginner through Intermediate."
        />
      ) : null}

      {friends.length > 0 ? (
        <View style={styles.friendsBlock}>
          <Text style={styles.label}>Invite friends</Text>
          <Text style={styles.help}>They’ll be added to the group when you create it.</Text>
          {friends.map((f) => {
            const on = inviteIds.has(f.id);
            return (
              <Pressable
                key={f.id}
                onPress={() => toggleFriend(f.id)}
                style={[styles.friendRow, on && styles.friendRowOn]}
              >
                <View style={styles.friendCopy}>
                  <Text style={styles.friendName}>{f.display_name}</Text>
                  <Text style={styles.friendMeta}>@{f.friend_tag}</Text>
                </View>
                <View style={[styles.check, on && styles.checkOn]} />
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={styles.help}>
          Add friends from player profiles first — then you can invite them into new groups.
        </Text>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <AppButton label="Create group" onPress={onCreate} loading={loading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Do not set paddingTop here — Screen adds header-safe padding; overriding it
  // pulls content under the glass header.
  content: { gap: spacing.md },
  intro: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  coverPick: { alignItems: 'center', gap: 8, marginVertical: 4 },
  coverImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.elevated,
  },
  coverEmpty: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.elevated,
    borderWidth: 1.5,
    borderColor: 'rgba(200,255,46,0.45)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPlus: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 32,
    color: colors.accentGreen,
  },
  coverHint: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 14,
    color: colors.accentGreen,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  help: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: -4,
  },
  hubRow: { gap: 8, paddingVertical: 2 },
  hubChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hubChipOn: {
    borderColor: colors.accentGreen,
    backgroundColor: colors.accentGreenDim,
  },
  hubText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 13,
    color: colors.textSecondary,
  },
  hubTextOn: { color: colors.accentGreen },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  friendsBlock: { gap: 8 },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  friendRowOn: {
    borderColor: colors.accentGreen,
    backgroundColor: colors.accentGreenDim,
  },
  friendCopy: { flex: 1, gap: 2 },
  friendName: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  friendMeta: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 12,
    color: colors.textMuted,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
  },
  checkOn: {
    borderColor: colors.accentGreen,
    backgroundColor: colors.accentGreen,
  },
  error: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.error,
  },
  actions: { marginTop: spacing.sm, marginBottom: spacing.xl },
});
