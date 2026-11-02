import { colors, spacing } from '@padel-nerdz/config';
import {
  Contact,
  ContactField,
  ContactsSortOrder,
  getPermissionsAsync,
  requestPermissionsAsync,
} from 'expo-contacts';
import * as Linking from 'expo-linking';
import * as SMS from 'expo-sms';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { select, success, warn } from '@/lib/feedback';
import { getGroup, type GroupSummary } from '@/lib/groups';
import { useGlassHeaderOffset } from '@/lib/layout';

type ContactRow = {
  id: string;
  name: string;
  phone: string;
  letter: string;
};

type PermState = 'unknown' | 'granted' | 'denied' | 'unavailable' | 'error';

function normalizePhone(raw: string) {
  return raw.replace(/[^\d+]/g, '');
}

function initial(name: string) {
  const letter = name.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(letter) ? letter : '#';
}

/**
 * Expo SDK 58 removed getContactsAsync from the main entry (it throws).
 * Use the new Contact.getAllDetails / presentPicker APIs.
 */
async function fetchAllContacts(): Promise<ContactRow[]> {
  const pageSize = 250;
  let offset = 0;
  const rows: ContactRow[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < 40; i += 1) {
    const batch = await Contact.getAllDetails(
      [
        ContactField.FULL_NAME,
        ContactField.GIVEN_NAME,
        ContactField.FAMILY_NAME,
        ContactField.PHONES,
      ] as const,
      {
        limit: pageSize,
        offset,
        sortOrder: ContactsSortOrder.GivenName,
      },
    );

    for (const c of batch) {
      const phones = c.phones ?? [];
      const phoneRaw = phones.find((p) => p.number)?.number;
      if (!phoneRaw) continue;
      const phone = normalizePhone(phoneRaw);
      if (!phone || seen.has(phone)) continue;
      seen.add(phone);
      const composed = [c.givenName, c.familyName].filter(Boolean).join(' ').trim();
      const name = (c.fullName || composed || 'Unknown').trim() || 'Unknown';
      rows.push({
        id: `${phone}-${rows.length}`,
        name,
        phone,
        letter: initial(name),
      });
    }

    if (batch.length < pageSize) break;
    offset += batch.length;
  }

  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}

export default function InviteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const headerOffset = useGlassHeaderOffset();
  const { profile, user, offline } = useAuth();
  const isGuest = offline;
  const userId = user?.id ?? profile?.id ?? '';

  const [group, setGroup] = useState<GroupSummary | null>(null);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [permission, setPermission] = useState<PermState>('unknown');
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [query, setQuery] = useState('');
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadGroup = useCallback(async () => {
    if (!id || !userId) return;
    setGroup(await getGroup(id, userId, isGuest));
  }, [id, userId, isGuest]);

  const loadContacts = useCallback(async () => {
    if (Platform.OS === 'web') {
      setPermission('unavailable');
      setContacts([]);
      return;
    }

    setLoadingContacts(true);
    setErrorMsg(null);
    try {
      const current = await getPermissionsAsync();
      let status = current.status;
      if (status !== 'granted') {
        const req = await requestPermissionsAsync();
        status = req.status;
      }
      if (status !== 'granted') {
        setPermission('denied');
        setContacts([]);
        return;
      }
      setPermission('granted');

      // iOS 18 limited library: let the user grant more contacts if the list is empty.
      try {
        const count = await Contact.getCount();
        if (count === 0 && Platform.OS === 'ios') {
          await Contact.presentAccessPicker();
        }
      } catch {
        // presentAccessPicker is iOS 18+, ignore on older OS
      }

      const rows = await fetchAllContacts();
      setContacts(rows);
    } catch (e) {
      console.warn(e);
      void warn();
      setPermission('error');
      setErrorMsg(
        e instanceof Error
          ? e.message
          : 'Could not load contacts. Try “Pick a contact” below.',
      );
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadGroup();
      void loadContacts();
    }, [loadGroup, loadContacts]),
  );

  const inviteUrl = group
    ? Linking.createURL(`join/${group.invite_code ?? group.id}`)
    : '';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q),
    );
  }, [contacts, query]);

  async function inviteContact(contact: ContactRow) {
    if (!group?.invite_code || invitingId) return;
    void select();
    setInvitingId(contact.id);
    try {
      const message = `Join ${group.name} on Padel Nerdz\nCode: ${group.invite_code}\n${inviteUrl}`;
      const available = await SMS.isAvailableAsync();
      if (available) {
        await SMS.sendSMSAsync([contact.phone], message);
        void success();
        return;
      }
      await Share.share({ message });
      void success();
    } finally {
      setInvitingId(null);
    }
  }

  async function pickOneContact() {
    if (Platform.OS === 'web') return;
    void select();
    try {
      const current = await getPermissionsAsync();
      if (current.status !== 'granted') {
        const req = await requestPermissionsAsync();
        if (req.status !== 'granted') {
          setPermission('denied');
          return;
        }
      }
      const picked = await Contact.presentPicker();
      if (!picked) return;
      const details = await picked.getDetails([
        ContactField.FULL_NAME,
        ContactField.GIVEN_NAME,
        ContactField.FAMILY_NAME,
        ContactField.PHONES,
      ] as const);
      const phoneRaw = details.phones?.find((p) => p.number)?.number;
      if (!phoneRaw) {
        setErrorMsg('That contact has no phone number.');
        return;
      }
      const composed = [details.givenName, details.familyName]
        .filter(Boolean)
        .join(' ')
        .trim();
      const name = (details.fullName || composed || 'Unknown').trim() || 'Unknown';
      const row: ContactRow = {
        id: `pick-${normalizePhone(phoneRaw)}`,
        name,
        phone: normalizePhone(phoneRaw),
        letter: initial(name),
      };
      setContacts((prev) => {
        if (prev.some((c) => c.phone === row.phone)) return prev;
        return [row, ...prev];
      });
      setPermission('granted');
      await inviteContact(row);
    } catch (e) {
      void warn();
      setErrorMsg(e instanceof Error ? e.message : 'Could not open contact picker');
    }
  }

  async function shareInvite() {
    if (!group?.invite_code) return;
    void select();
    await Share.share({
      message: `Join ${group.name} on Padel Nerdz\nInvite code: ${group.invite_code}\n${inviteUrl}`,
    });
  }

  async function openSystemSettings() {
    void select();
    await Linking.openSettings();
  }

  const showContactsBlocked =
    permission === 'denied' || permission === 'error' || permission === 'unavailable';

  return (
    <>
      <Stack.Screen options={{ title: 'Invite', headerBackTitle: 'Back' }} />
      <View style={[styles.root, { paddingBottom: insets.bottom }]}>
        <View style={[styles.searchWrap, { paddingTop: headerOffset }]}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name or number"
            placeholderTextColor={colors.textMuted}
            cursorColor={colors.accentGreen}
            selectionColor="rgba(200,255,46,0.28)"
            keyboardAppearance="dark"
            underlineColorAndroid="transparent"
            style={styles.search}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              <Pressable style={styles.shareRow} onPress={() => void shareInvite()}>
                <View style={[styles.avatar, styles.shareAvatar]}>
                  <Text style={styles.shareIcon}>↑</Text>
                </View>
                <View style={styles.copy}>
                  <Text style={styles.name}>Share invite link</Text>
                  <Text style={styles.meta}>
                    Code {group?.invite_code ?? '-'} · anyone with the link can join
                  </Text>
                </View>
              </Pressable>

              {Platform.OS !== 'web' ? (
                <Pressable style={styles.shareRow} onPress={() => void pickOneContact()}>
                  <View style={[styles.avatar, styles.pickAvatar]}>
                    <Text style={styles.shareIcon}>+</Text>
                  </View>
                  <View style={styles.copy}>
                    <Text style={styles.name}>Pick a contact</Text>
                    <Text style={styles.meta}>
                      Opens your phone book, works even if the full list fails
                    </Text>
                  </View>
                </Pressable>
              ) : null}

              <Text style={styles.section}>
                Contacts{contacts.length ? ` · ${contacts.length}` : ''}
              </Text>

              {showContactsBlocked ? (
                <View style={styles.banner}>
                  <Text style={styles.bannerTitle}>
                    {permission === 'unavailable'
                      ? 'Contacts unavailable here'
                      : permission === 'error'
                        ? 'Couldn’t load contacts'
                        : 'Contacts access needed'}
                  </Text>
                  <Text style={styles.bannerBody}>
                    {permission === 'unavailable'
                      ? 'Phone book invites need the iOS or Android app. Share the invite link instead.'
                      : permission === 'error'
                        ? errorMsg ??
                          'Something went wrong reading your phone book. Try “Pick a contact” or share the invite link.'
                        : 'Allow contacts in Settings so you can invite padel friends from your phone book.'}
                  </Text>
                  {permission === 'denied' ? (
                    <Pressable onPress={() => void openSystemSettings()} style={styles.retry}>
                      <Text style={styles.retryText}>Open Settings</Text>
                    </Pressable>
                  ) : null}
                  {permission === 'denied' || permission === 'error' ? (
                    <Pressable onPress={() => void loadContacts()} style={styles.retry}>
                      <Text style={styles.retryText}>Try again</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              {loadingContacts ? (
                <ActivityIndicator color={colors.accentGreen} style={{ marginVertical: 24 }} />
              ) : null}
            </View>
          }
          ListEmptyComponent={
            !loadingContacts && permission === 'granted' ? (
              <Text style={styles.empty}>
                {query.trim()
                  ? 'No contacts match that search.'
                  : 'No contacts with phone numbers found. Try “Pick a contact” above.'}
              </Text>
            ) : (
              <View />
            )
          }
          renderItem={({ item, index }) => {
            const prev = filtered[index - 1];
            const showLetter = !prev || prev.letter !== item.letter;
            return (
              <View>
                {showLetter ? <Text style={styles.letter}>{item.letter}</Text> : null}
                <Pressable
                  style={styles.contactRow}
                  onPress={() => void inviteContact(item)}
                  disabled={invitingId === item.id}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.letter === '#' ? '?' : item.letter}</Text>
                  </View>
                  <View style={styles.copy}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {item.phone}
                    </Text>
                  </View>
                  <Text style={styles.invite}>
                    {invitingId === item.id ? '…' : 'Invite'}
                  </Text>
                </Pressable>
              </View>
            );
          }}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchWrap: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  search: {
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.elevated,
    color: colors.textPrimary,
    fontFamily: 'Figtree_400Regular',
    fontSize: 16,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  section: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    marginHorizontal: spacing.md,
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 13,
    color: colors.textMuted,
  },
  letter: {
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 4,
    fontFamily: 'Figtree_700Bold',
    fontSize: 13,
    color: colors.accentGreen,
    backgroundColor: colors.background,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.elevated2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareAvatar: {
    backgroundColor: colors.accentGreenDim,
  },
  pickAvatar: {
    backgroundColor: 'rgba(200,255,46,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.35)',
  },
  shareIcon: {
    fontSize: 20,
    color: colors.accentGreen,
    fontFamily: 'Figtree_700Bold',
  },
  avatarText: {
    color: colors.accentGreen,
    fontFamily: 'Figtree_700Bold',
    fontSize: 18,
  },
  copy: { flex: 1, gap: 2, minWidth: 0 },
  name: {
    color: colors.textPrimary,
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 16,
  },
  meta: {
    color: colors.textSecondary,
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
  },
  invite: {
    color: colors.accentGreen,
    fontFamily: 'Figtree_700Bold',
    fontSize: 15,
    paddingLeft: 8,
  },
  banner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.elevated,
    gap: 8,
  },
  bannerTitle: {
    fontFamily: 'Figtree_700Bold',
    color: colors.textPrimary,
    fontSize: 16,
  },
  bannerBody: {
    fontFamily: 'Figtree_400Regular',
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  retry: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  retryText: {
    color: colors.accentGreen,
    fontFamily: 'Figtree_700Bold',
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 32,
    paddingHorizontal: spacing.lg,
    fontFamily: 'Figtree_400Regular',
  },
});
