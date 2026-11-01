import { AppButton } from '@/components/AppButton';
import type { GroupVisibility } from '@padel-nerdz/domain';
import { colors, spacing, typography } from '@padel-nerdz/config';
import { Screen, TextField } from '@padel-nerdz/ui';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { LevelRangePicker, type LevelChoice } from '@/components/LevelRangePicker';
import { VisibilityPicker } from '@/components/VisibilityPicker';
import { useAuth } from '@/lib/auth';
import { select, success, tap } from '@/lib/feedback';
import { getGroup, updateGroup } from '@/lib/groups';

export default function GroupSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, user , offline } = useAuth();
  const isGuest = offline;
  const userId = user?.id ?? profile?.id ?? '';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [visibility, setVisibility] = useState<GroupVisibility>('private');
  const [levelChoice, setLevelChoice] = useState<LevelChoice>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [membersCanPost, setMembersCanPost] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const needsLevel = visibility === 'public' || visibility === 'approval';

  useEffect(() => {
    if (!id || !userId) return;
    void getGroup(id, userId, isGuest).then((group) => {
      if (!group) return;
      setName(group.name);
      setDescription(group.description ?? '');
      setLocation(group.location_label ?? '');
      setVisibility(group.visibility);
      if (group.skill_level && group.skill_level !== 'unknown') {
        const max =
          group.skill_level_max && group.skill_level_max !== 'unknown'
            ? group.skill_level_max
            : group.skill_level;
        if (group.skill_level === 'beginner' && max === 'pro') {
          setLevelChoice('all');
        } else {
          setLevelChoice({ min: group.skill_level, max });
        }
      } else if (group.visibility === 'public' || group.visibility === 'approval') {
        setLevelChoice('all');
      } else {
        setLevelChoice(null);
      }
      setCoverUrl(group.cover_url);
      setMembersCanPost(group.members_can_post);
    });
  }, [id, userId, isGuest]);

  async function pickCover() {
    void tap();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setCoverUrl(result.assets[0].uri);
    }
  }

  async function onSave() {
    if (!id || !userId) return;
    setError(undefined);
    if (name.trim().length < 2) {
      setError('Name is required');
      return;
    }
    if (needsLevel && !levelChoice) {
      setError('Choose who can join, or tap All levels');
      return;
    }
    setLoading(true);
    try {
      const skillMin =
        needsLevel && levelChoice && levelChoice !== 'all' ? levelChoice.min : null;
      const skillMax =
        needsLevel && levelChoice && levelChoice !== 'all' ? levelChoice.max : null;
      await updateGroup(id, userId, isGuest, {
        name,
        description,
        location_label: location,
        visibility,
        skill_level: skillMin,
        skill_level_max: skillMax,
        cover_url: coverUrl,
        members_can_post: membersCanPost,
      });
      void success();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Group settings', headerBackTitle: 'Admin' }} />
      <Screen scroll edges={['left', 'right', 'bottom']} contentStyle={styles.content}>
        <Pressable style={styles.avatarPick} onPress={() => void pickCover()}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.cover} />
          ) : (
            <View style={styles.coverEmpty}>
              <Text style={styles.coverEmptyText}>Add group avatar / cover</Text>
            </View>
          )}
        </Pressable>

        <TextField label="Name" value={name} onChangeText={setName} error={error} />
        <TextField
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          style={styles.multiline}
        />
        <TextField
          label="Town or city"
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. Marbella, Madrid, Buenos Aires"
          autoCorrect={false}
        />
        <VisibilityPicker
          value={visibility}
          onChange={(next) => {
            setVisibility(next);
            if (next === 'private') setLevelChoice(null);
          }}
        />
        {needsLevel ? (
          <LevelRangePicker
            value={levelChoice}
            required
            allowAll
            onChange={setLevelChoice}
            label="Who can join"
            help="All levels, one level, or a band — e.g. Beginner through Intermediate."
          />
        ) : null}

        <Text style={styles.section}>Chat permissions</Text>
        <Pressable
          style={[styles.toggle, membersCanPost && styles.toggleOn]}
          onPress={() => {
            void select();
            setMembersCanPost(true);
          }}
        >
          <Text style={styles.toggleTitle}>Anyone can post</Text>
          <Text style={styles.toggleMeta}>All members send messages in group chat</Text>
        </Pressable>
        <Pressable
          style={[styles.toggle, !membersCanPost && styles.toggleOn]}
          onPress={() => {
            void select();
            setMembersCanPost(false);
          }}
        >
          <Text style={styles.toggleTitle}>Admins only</Text>
          <Text style={styles.toggleMeta}>Only organisers post — members read</Text>
        </Pressable>

        <AppButton label="Save settings" onPress={onSave} loading={loading} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  avatarPick: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cover: { width: '100%', height: 140 },
  coverEmpty: {
    height: 120,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEmptyText: {
    fontFamily: 'Figtree_600SemiBold',
    color: colors.accentGreen,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  section: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  toggle: {
    backgroundColor: colors.elevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  toggleOn: {
    borderColor: colors.accentGreen,
    backgroundColor: colors.accentGreenDim,
  },
  toggleTitle: {
    fontFamily: 'Figtree_700Bold',
    color: colors.textPrimary,
    fontSize: 15,
  },
  toggleMeta: {
    fontFamily: 'Figtree_400Regular',
    color: colors.textSecondary,
    fontSize: 13,
  },
});
