import { colors, radii, spacing } from '@padel-nerdz/config';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { HeaderBack } from '@/components/HeaderBack';
import { useAuth } from '@/lib/auth';
import { parseCheckInInput, verifyCheckInCode } from '@/lib/check-in';
import { select, success, tap, warn } from '@/lib/feedback';
import { canOrganiseGroup, getGroup } from '@/lib/groups';
import { useGlassHeaderOffset } from '@/lib/layout';
import {
  findRegistrantByCheckInCode,
  getSession,
  listRegistrants,
  markSessionCheckIn,
  type Registrant,
  type SessionSummary,
} from '@/lib/sessions';

export default function CheckInScanScreen() {
  const { id, sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();
  const insets = useSafeAreaInsets();
  const headerOffset = useGlassHeaderOffset(12);
  const { profile, user, offline } = useAuth();
  const isGuest = offline;
  const userId = user?.id ?? profile?.id ?? '';

  const [permission, requestPermission] = useCameraPermissions();
  const [session, setSession] = useState<SessionSummary | null>(null);
  const [players, setPlayers] = useState<Registrant[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scanPaused, setScanPaused] = useState(false);
  const [lastScanName, setLastScanName] = useState<string | null>(null);
  const playersRef = useRef<Registrant[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (!id || !sessionId || !userId) return;
    setLoading(true);
    try {
      const [g, s, regs] = await Promise.all([
        getGroup(id, userId, isGuest),
        getSession(sessionId, isGuest),
        listRegistrants(sessionId, id, isGuest),
      ]);
      if (!canOrganiseGroup(g, userId)) {
        Alert.alert('Organisers only', 'Only organisers can scan check-ins.');
        router.back();
        return;
      }
      setSession(s);
      const next = regs.filter((r) => r.status === 'paid' || r.status === 'no_show');
      playersRef.current = next;
      setPlayers(next);
    } finally {
      setLoading(false);
    }
  }, [id, sessionId, userId, isGuest]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      if (!permission?.granted) {
        void requestPermission();
      }
      return () => {
        if (cooldownRef.current) clearTimeout(cooldownRef.current);
      };
    }, [refresh, permission?.granted, requestPermission]),
  );

  function pauseScan(ms = 2200) {
    setScanPaused(true);
    if (cooldownRef.current) clearTimeout(cooldownRef.current);
    cooldownRef.current = setTimeout(() => {
      setScanPaused(false);
      setLastScanName(null);
    }, ms);
  }

  async function checkInUser(targetUserId: string, name: string) {
    if (!id || !sessionId) return;
    setBusy(true);
    try {
      await markSessionCheckIn({
        sessionId,
        groupId: id,
        userId: targetUserId,
        isGuest,
      });
      void success();
      setLastScanName(name);
      pauseScan();
      await refresh();
    } catch (e) {
      void warn();
      Alert.alert('Check-in failed', e instanceof Error ? e.message : 'Try again');
      setScanPaused(false);
    } finally {
      setBusy(false);
    }
  }

  async function resolveAndCheckIn(raw: string) {
    if (!id || !sessionId || busy) return;
    const parsed = parseCheckInInput(raw, sessionId);
    if (!parsed) {
      void warn();
      Alert.alert('Invalid ticket', 'That QR isn’t a Padel Nerdz check-in code.');
      pauseScan(1400);
      return;
    }
    if (parsed.sessionId !== sessionId) {
      void warn();
      Alert.alert('Wrong session', 'This ticket is for a different mix-in.');
      pauseScan(1400);
      return;
    }

    setBusy(true);
    try {
      let target: Registrant | null = null;
      const roster = playersRef.current;
      if (parsed.userId) {
        if (!verifyCheckInCode(sessionId, parsed.userId, parsed.code)) {
          throw new Error('Code does not match this session');
        }
        target = roster.find((p) => p.user_id === parsed.userId) ?? null;
      } else {
        target = await findRegistrantByCheckInCode({
          sessionId,
          groupId: id,
          code: parsed.code,
          isGuest,
        });
      }
      if (!target) {
        throw new Error('No paid player matches that ticket');
      }
      if (target.checked_in_at) {
        void warn();
        setLastScanName(`${target.display_name} (already in)`);
        pauseScan(1600);
        return;
      }
      await markSessionCheckIn({
        sessionId,
        groupId: id,
        userId: target.user_id,
        isGuest,
      });
      void success();
      setLastScanName(target.display_name);
      setDraft('');
      pauseScan();
      await refresh();
    } catch (e) {
      void warn();
      Alert.alert('Check-in failed', e instanceof Error ? e.message : 'Try again');
      pauseScan(1400);
    } finally {
      setBusy(false);
    }
  }

  function onBarcodeScanned(result: BarcodeScanningResult) {
    if (scanPaused || busy || !result?.data) return;
    setScanPaused(true);
    void resolveAndCheckIn(String(result.data));
  }

  async function onSubmitCode() {
    if (!draft.trim() || busy) return;
    void tap();
    await resolveAndCheckIn(draft);
  }

  const inCount = players.filter((p) => p.checked_in_at).length;
  const cameraReady = Boolean(permission?.granted);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Scan tickets',
          headerBackVisible: false,
          headerLeft: () => (
            <HeaderBack
              fallbackHref={
                session?.session_room_id
                  ? `/group/${id}/session-room/${session.session_room_id}`
                  : `/group/${id}/admin`
              }
            />
          ),
        }}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentGreen} />
        </View>
      ) : (
        <View style={styles.root}>
          <View style={[styles.cameraBlock, { marginTop: headerOffset }]}>
            {cameraReady ? (
              <View style={styles.cameraFrame}>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={scanPaused || busy ? undefined : onBarcodeScanned}
                />
                <View style={styles.viewfinder} pointerEvents="none">
                  <View style={[styles.corner, styles.tl]} />
                  <View style={[styles.corner, styles.tr]} />
                  <View style={[styles.corner, styles.bl]} />
                  <View style={[styles.corner, styles.br]} />
                </View>
                <View style={styles.cameraHud}>
                  <Text style={styles.cameraHudText}>
                    {lastScanName
                      ? `✓ ${lastScanName}`
                      : busy
                        ? 'Checking…'
                        : 'Point at player ticket QR'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.permCard}>
                <Text style={styles.permTitle}>Camera needed</Text>
                <Text style={styles.permBody}>
                  Allow camera access so you can scan player ticket QR codes at the courts.
                </Text>
                <Pressable
                  style={styles.scanBtn}
                  onPress={() => {
                    void tap();
                    if (permission?.canAskAgain === false && Platform.OS !== 'web') {
                      void Linking.openSettings();
                      return;
                    }
                    void requestPermission();
                  }}
                >
                  <Text style={styles.scanBtnText}>
                    {permission?.canAskAgain === false && Platform.OS !== 'web'
                      ? 'Open settings'
                      : 'Enable camera'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          <FlatList
            data={players}
            keyExtractor={(item) => item.user_id}
            style={styles.list}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
            ListHeaderComponent={
              <View style={styles.headerBlock}>
                <Text style={styles.title}>{session?.title ?? 'Session'}</Text>
                <Text style={styles.sub}>
                  {inCount}/{players.length} checked in
                </Text>
                <View style={styles.scanCard}>
                  <Text style={styles.scanLabel}>OR ENTER CODE</Text>
                  <TextInput
                    style={styles.input}
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="6-char code"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    cursorColor={colors.accentGreen}
                    selectionColor="rgba(200,255,46,0.28)"
                    keyboardAppearance="dark"
                  />
                  <Pressable
                    style={[styles.scanBtn, (!draft.trim() || busy) && styles.scanBtnDisabled]}
                    disabled={!draft.trim() || busy}
                    onPress={() => void onSubmitCode()}
                  >
                    <Text style={styles.scanBtnText}>
                      {busy ? 'Checking…' : 'Confirm arrival'}
                    </Text>
                  </Pressable>
                </View>
                <Text style={styles.section}>Paid players</Text>
              </View>
            }
            ListEmptyComponent={<Text style={styles.empty}>No paid players yet</Text>}
            renderItem={({ item }) => {
              const inNow = Boolean(item.checked_in_at);
              return (
                <View style={styles.row}>
                  <Avatar name={item.display_name} size={40} />
                  <View style={styles.rowCopy}>
                    <Text style={styles.name}>{item.display_name}</Text>
                    <Text style={styles.meta}>
                      {inNow
                        ? `In · ${new Date(item.checked_in_at!).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}`
                        : 'Waiting'}
                    </Text>
                  </View>
                  {inNow ? (
                    <Text style={styles.badge}>✓</Text>
                  ) : (
                    <Pressable
                      style={styles.manualBtn}
                      onPress={() => {
                        void select();
                        void checkInUser(item.user_id, item.display_name);
                      }}
                    >
                      <Text style={styles.manualBtnText}>Mark in</Text>
                    </Pressable>
                  )}
                </View>
              );
            }}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBlock: {
    paddingHorizontal: spacing.md,
    marginBottom: 8,
  },
  cameraFrame: {
    height: 280,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0B0D10',
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.35)',
  },
  viewfinder: {
    ...StyleSheet.absoluteFill,
    margin: 48,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: colors.accentGreen,
  },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
  cameraHud: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(11,13,16,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.28)',
  },
  cameraHudText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 14,
    color: colors.accentGreen,
    textAlign: 'center',
  },
  permCard: {
    minHeight: 200,
    borderRadius: 20,
    padding: spacing.md,
    gap: 10,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.28)',
    justifyContent: 'center',
  },
  permTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 18,
    color: colors.textPrimary,
  },
  permBody: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  headerBlock: { gap: 10, marginBottom: 8 },
  title: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 20,
    color: colors.textPrimary,
  },
  sub: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: -4,
  },
  scanCard: {
    marginTop: 4,
    backgroundColor: colors.elevated,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  scanLabel: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 10,
    letterSpacing: 0.9,
    color: colors.textMuted,
  },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  scanBtn: {
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBtnDisabled: { opacity: 0.45 },
  scanBtnText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 16,
    color: '#0B0D10',
  },
  section: {
    marginTop: 8,
    fontFamily: 'Figtree_700Bold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  empty: {
    fontFamily: 'Figtree_400Regular',
    color: colors.textMuted,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.elevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  rowCopy: { flex: 1, gap: 2 },
  name: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  meta: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 12,
    color: colors.textMuted,
  },
  badge: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 18,
    color: colors.accentGreen,
  },
  manualBtn: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: colors.accentGreenDim,
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualBtnText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 13,
    color: colors.accentGreen,
  },
});
