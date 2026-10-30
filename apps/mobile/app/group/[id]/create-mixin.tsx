import { AppButton } from '@/components/AppButton';
import type { SessionFormat } from '@padel-nerdz/domain';
import { colors, spacing, typography } from '@padel-nerdz/config';
import { Screen, TextField } from '@padel-nerdz/ui';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/lib/auth';
import { select, tap } from '@/lib/feedback';
import { formatMoney, PLATFORM_FEE_CENTS, priceBreakdown } from '@/lib/pricing';
import { createMixIn } from '@/lib/sessions';

/** Only formats with a live engine. Americano/Mexicano stay hidden until built. */
const FORMATS: { value: SessionFormat; label: string }[] = [
  { value: 'kings_and_queens', label: 'Kings & Queens' },
  { value: 'custom', label: 'Custom (open play)' },
];

function defaultStartDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(19, 0, 0, 0);
  return d;
}

export default function CreateMixInScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, user , offline } = useAuth();
  const isGuest = offline;
  const userId = user?.id ?? profile?.id ?? '';
  const displayName = profile?.display_name?.trim() || 'Organiser';

  const [title, setTitle] = useState('Thursday mix-in');
  const [venue, setVenue] = useState('');
  const [format, setFormat] = useState<SessionFormat>('kings_and_queens');
  const [courts, setCourts] = useState('2');
  const [maxPlayers, setMaxPlayers] = useState('8');
  const [price, setPrice] = useState('14');
  const [startsAt, setStartsAt] = useState(defaultStartDate);
  const [bannerUri, setBannerUri] = useState<string | null>(null);
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const dateLabel = useMemo(
    () =>
      startsAt.toLocaleDateString([], {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    [startsAt],
  );
  const timeLabel = useMemo(
    () => startsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    [startsAt],
  );

  async function pickBanner() {
    void tap();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setBannerUri(result.assets[0].uri);
    }
  }

  async function onCreate() {
    if (!id || !userId) return;
    setError(undefined);
    if (title.trim().length < 2) {
      setError('Add a title');
      return;
    }
    setLoading(true);
    try {
      await createMixIn({
        groupId: id,
        userId,
        displayName,
        isGuest,
        title,
        startsAt: startsAt.toISOString(),
        venueLabel: venue,
        format,
        courts: Math.max(1, Number(courts) || 1),
        maxPlayers: Math.max(4, Number(maxPlayers) || 8),
        priceCents: price.trim() ? Math.round(Number(price.replace(',', '.')) * 100) : null,
        // Platform fee is fixed server-side — never shown as a line item to players
        commissionCents: PLATFORM_FEE_CENTS,
        bannerUrl: bannerUri,
      });
      router.replace(`/group/${id}/chat`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create mix-in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Create mix-in', headerBackTitle: 'Admin' }} />
      <Screen scroll edges={['left', 'right', 'bottom']} contentStyle={styles.content}>
        <Text style={styles.intro}>
          Posts a registration card in group chat. You confirm the lineup later — even if not full.
        </Text>

        <Pressable style={styles.bannerPick} onPress={() => void pickBanner()}>
          {bannerUri ? (
            <Image source={{ uri: bannerUri }} style={styles.bannerImage} />
          ) : (
            <View style={styles.bannerEmpty}>
              <Text style={styles.bannerEmptyTitle}>Add event banner</Text>
              <Text style={styles.bannerEmptyMeta}>Court photo or club image</Text>
            </View>
          )}
        </Pressable>

        <TextField label="Title" value={title} onChangeText={setTitle} error={error} />
        <TextField label="Venue" value={venue} onChangeText={setVenue} placeholder="Club / courts" />

        <View style={styles.row}>
          <Pressable
            style={styles.pickerBtn}
            onPress={() => {
              void select();
              setShowDate(true);
              setShowTime(false);
            }}
          >
            <Text style={styles.pickerLabel}>Date</Text>
            <Text style={styles.pickerValue}>{dateLabel}</Text>
          </Pressable>
          <Pressable
            style={styles.pickerBtn}
            onPress={() => {
              void select();
              setShowTime(true);
              setShowDate(false);
            }}
          >
            <Text style={styles.pickerLabel}>Time</Text>
            <Text style={styles.pickerValue}>{timeLabel}</Text>
          </Pressable>
        </View>

        {showDate ? (
          <View style={styles.pickerPanel}>
            {Platform.OS === 'ios' ? (
              <Pressable
                style={styles.pickerDone}
                onPress={() => {
                  void tap();
                  setShowDate(false);
                }}
              >
                <Text style={styles.pickerDoneText}>Done</Text>
              </Pressable>
            ) : null}
            <DateTimePicker
              value={startsAt}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              themeVariant="dark"
              accentColor={colors.accentGreen}
              onChange={(_, date) => {
                if (Platform.OS !== 'ios') setShowDate(false);
                if (!date) return;
                setStartsAt((prev) => {
                  const next = new Date(prev);
                  next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                  return next;
                });
              }}
            />
          </View>
        ) : null}
        {showTime ? (
          <View style={styles.pickerPanel}>
            {Platform.OS === 'ios' ? (
              <Pressable
                style={styles.pickerDone}
                onPress={() => {
                  void tap();
                  setShowTime(false);
                }}
              >
                <Text style={styles.pickerDoneText}>Done</Text>
              </Pressable>
            ) : null}
            <DateTimePicker
              value={startsAt}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              themeVariant="dark"
              accentColor={colors.accentGreen}
              onChange={(_, date) => {
                if (Platform.OS !== 'ios') setShowTime(false);
                if (!date) return;
                setStartsAt((prev) => {
                  const next = new Date(prev);
                  next.setHours(date.getHours(), date.getMinutes(), 0, 0);
                  return next;
                });
              }}
            />
          </View>
        ) : null}

        <View style={styles.block}>
          <Text style={styles.label}>Format</Text>
          {FORMATS.map((item) => {
            const selected = format === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => {
                  void select();
                  setFormat(item.value);
                }}
                style={[styles.formatRow, selected && styles.formatSelected]}
              >
                <Text style={[styles.formatLabel, selected && styles.formatLabelSelected]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextField label="Courts" value={courts} onChangeText={setCourts} keyboardType="number-pad" />
        <TextField
          label="Max players"
          value={maxPlayers}
          onChangeText={setMaxPlayers}
          keyboardType="number-pad"
        />
        <TextField
          label="Your price per player (€)"
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          inputMode="decimal"
        />
        <Text style={styles.priceHint}>
          Players see one total (your price + service). They don’t see a separate commission line.
          Example: €14 → they pay {formatMoney(priceBreakdown(Math.round(Number(price.replace(',', '.') || '0') * 100)).playerTotalCents)}.
        </Text>

        <AppButton label="Create mix-in" onPress={onCreate} loading={loading} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  intro: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  priceHint: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: -4,
  },
  bannerPick: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
  },
  bannerImage: { width: '100%', height: 160 },
  bannerEmpty: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bannerEmptyTitle: {
    fontFamily: 'Figtree_700Bold',
    color: colors.accentGreen,
    fontSize: 15,
  },
  bannerEmptyMeta: {
    fontFamily: 'Figtree_400Regular',
    color: colors.textMuted,
    fontSize: 13,
  },
  row: { flexDirection: 'row', gap: 10 },
  pickerBtn: {
    flex: 1,
    backgroundColor: colors.elevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  pickerLabel: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  pickerValue: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  pickerPanel: {
    backgroundColor: colors.elevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pickerDone: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pickerDoneText: {
    fontFamily: 'Figtree_600SemiBold',
    color: colors.accentGreen,
    fontSize: 15,
  },
  block: { gap: spacing.sm },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  formatRow: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  formatSelected: {
    borderColor: colors.accentGreen,
  },
  formatLabel: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  formatLabelSelected: {
    color: colors.accentGreen,
  },
});
