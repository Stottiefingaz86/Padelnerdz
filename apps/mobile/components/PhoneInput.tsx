import { colors, radii, spacing, typography } from '@padel-nerdz/config';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { COUNTRIES, type CountryOption } from '@/lib/phone';

type Props = {
  country: CountryOption;
  national: string;
  onCountryChange: (country: CountryOption) => void;
  onNationalChange: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
};

export function PhoneInput({
  country,
  national,
  onCountryChange,
  onNationalChange,
  error,
  autoFocus,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose country"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.countryRow, pressed && styles.pressed]}
      >
        <Text style={styles.countryName}>{country.label}</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <View style={[styles.phoneRow, error ? styles.phoneRowError : null]}>
        <Text style={styles.dial}>{country.dial}</Text>
        <TextInput
          style={styles.input}
          value={national}
          onChangeText={onNationalChange}
          keyboardType="phone-pad"
          autoComplete="tel-national"
          textContentType="telephoneNumber"
          placeholder={country.example}
          placeholderTextColor={colors.textMuted}
          cursorColor={colors.accentGreen}
          selectionColor="rgba(200,255,46,0.28)"
          keyboardAppearance="dark"
          underlineColorAndroid="transparent"
          autoFocus={autoFocus}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setOpen(false)} hitSlop={8}>
              <Text style={styles.modalAction}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Select country</Text>
            <View style={styles.modalActionSpacer} />
          </View>
          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor={colors.textMuted}
            cursorColor={colors.accentGreen}
            selectionColor="rgba(200,255,46,0.28)"
            keyboardAppearance="dark"
            underlineColorAndroid="transparent"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const selected = item.code === country.code;
              return (
                <Pressable
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => {
                    onCountryChange(item);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                    {item.label}
                  </Text>
                  <Text style={styles.optionDial}>{item.dial}</Text>
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.elevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.75,
  },
  countryName: {
    ...typography.body,
    color: colors.accentGreen,
  },
  chevron: {
    fontSize: 22,
    color: colors.textMuted,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    backgroundColor: colors.elevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  phoneRowError: {
    borderColor: colors.error,
  },
  dial: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
    minWidth: 48,
  },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.textPrimary,
    minHeight: 52,
  },
  error: {
    ...typography.caption,
    color: colors.error,
  },
  modal: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  modalAction: {
    ...typography.body,
    color: colors.accentGreen,
    width: 64,
  },
  modalActionSpacer: {
    width: 64,
  },
  search: {
    ...typography.body,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.elevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionSelected: {
    backgroundColor: colors.elevated,
  },
  optionLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  optionLabelSelected: {
    color: colors.accentGreen,
  },
  optionDial: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
