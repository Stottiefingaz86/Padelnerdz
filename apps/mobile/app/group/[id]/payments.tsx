import { colors, radii, spacing } from '@padel-nerdz/config';
import { Screen } from '@padel-nerdz/ui';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/lib/auth';
import { select, success, tap, warn } from '@/lib/feedback';
import {
  getGroupPaymentSettings,
  saveGroupPaymentSettings,
  type PaymentMethod,
} from '@/lib/payments';

const METHODS: { id: PaymentMethod; title: string; body: string; disabled?: boolean }[] = [
  {
    id: 'revolut',
    title: 'Revolut',
    body: 'Players open your Revolut.me link and pay you',
  },
  {
    id: 'bizum',
    title: 'Bizum',
    body: 'Spanish bank transfer to your mobile number',
  },
  {
    id: 'stripe',
    title: 'Stripe / card',
    body: 'Integrated checkout — not available yet',
    disabled: true,
  },
];

export default function GroupPaymentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, user, offline } = useAuth();
  const isGuest = offline;
  const userId = user?.id ?? profile?.id ?? '';

  const [method, setMethod] = useState<PaymentMethod>('revolut');
  const [revolutCode, setRevolutCode] = useState('');
  const [bizumPhone, setBizumPhone] = useState('');
  const [bizumName, setBizumName] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const s = await getGroupPaymentSettings(id, isGuest);
      setMethod(s.preferred_method === 'stripe' ? 'revolut' : s.preferred_method);
      setRevolutCode(s.revolut_me_code ?? '');
      setBizumPhone(s.bizum_phone ?? '');
      setBizumName(s.bizum_name ?? '');
      setNote(s.payment_note ?? '');
    } finally {
      setLoading(false);
    }
  }, [id, isGuest]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function onSave() {
    if (!id || !userId) return;
    if (method === 'revolut' && !revolutCode.trim()) {
      void warn();
      Alert.alert(
        'Revolut.me username needed',
        'Paste the username from your Revolut.me link (the part after revolut.me/).',
      );
      return;
    }
    if (method === 'bizum' && !bizumPhone.trim()) {
      void warn();
      Alert.alert('Bizum phone needed', 'Enter the mobile number linked to Bizum on your bank.');
      return;
    }
    setSaving(true);
    try {
      await saveGroupPaymentSettings({
        groupId: id,
        userId,
        isGuest,
        preferred_method: method,
        revolut_me_code: revolutCode,
        bizum_phone: bizumPhone,
        bizum_name: bizumName,
        payment_note: note,
      });
      void success();
      router.back();
    } catch {
      void warn();
      Alert.alert('Couldn’t save', 'Try again in a moment.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accentGreen} />
      </View>
    );
  }

  const codePreview = revolutCode.trim().replace(/^@/, '').replace(/^https?:\/\/revolut\.me\//i, '');

  return (
    <>
      <Stack.Screen options={{ title: 'How you get paid', headerBackTitle: 'Admin' }} />
      <Screen scroll edges={['left', 'right', 'bottom']} contentStyle={styles.content}>
        <Text style={styles.intro}>
          Selected players pay you outside the app. You confirm the transfer here — no card fees yet.
        </Text>

        {METHODS.map((item) => {
          const on = method === item.id;
          return (
            <Pressable
              key={item.id}
              disabled={item.disabled}
              onPress={() => {
                void select();
                if (!item.disabled) setMethod(item.id);
              }}
              style={[styles.method, on && styles.methodOn, item.disabled && styles.methodDisabled]}
            >
              <View style={[styles.radio, on && styles.radioOn]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.methodTitle}>{item.title}</Text>
                <Text style={styles.methodBody}>{item.body}</Text>
              </View>
            </Pressable>
          );
        })}

        {method === 'revolut' ? (
          <View style={styles.guide}>
            <Text style={styles.guideTitle}>Set up Revolut.me (2 minutes)</Text>
            <Text style={styles.step}>1. Open the Revolut app on your phone.</Text>
            <Text style={styles.step}>
              2. Tap your profile (top-left) → scroll to <Text style={styles.em}>Revolut.me</Text> or
              search “Revolut.me” in settings.
            </Text>
            <Text style={styles.step}>
              3. Turn on / create your public payment page if you haven’t already.
            </Text>
            <Text style={styles.step}>
              4. Copy only the username — the bit after{' '}
              <Text style={styles.em}>revolut.me/</Text> (e.g. if the link is revolut.me/alexpadel,
              enter <Text style={styles.em}>alexpadel</Text>).
            </Text>
            <Text style={styles.step}>
              5. Paste it below and save. Players will open that link with the mix-in amount.
            </Text>

            <Pressable
              style={styles.linkBtn}
              onPress={() => {
                void tap();
                void Linking.openURL('https://revolut.me/');
              }}
            >
              <Text style={styles.linkBtnText}>Open revolut.me in browser →</Text>
            </Pressable>

            <Text style={styles.label}>Your Revolut.me username</Text>
            <TextInput
              value={revolutCode}
              onChangeText={(t) =>
                setRevolutCode(t.replace(/^@/, '').replace(/^https?:\/\/revolut\.me\//i, '').trim())
              }
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="alexpadel"
              placeholderTextColor={colors.textMuted}
              cursorColor={colors.accentGreen}
              selectionColor="rgba(200,255,46,0.28)"
              keyboardAppearance="dark"
              style={styles.input}
            />
            <Text style={styles.hint}>
              Players will open{'\n'}
              <Text style={styles.em}>
                https://revolut.me/{codePreview || 'yourname'}
              </Text>
            </Text>
          </View>
        ) : null}

        {method === 'bizum' ? (
          <View style={styles.guide}>
            <Text style={styles.guideTitle}>Set up Bizum</Text>
            <Text style={styles.step}>
              1. Open your Spanish bank app (or Bizum) and confirm Bizum is activated on your mobile
              number.
            </Text>
            <Text style={styles.step}>
              2. Enter that same phone number below (with country code, e.g. +34…).
            </Text>
            <Text style={styles.step}>
              3. Optional: add the name that shows on Bizum so players recognise you.
            </Text>
            <Text style={styles.step}>
              4. Save. When players are selected, they see your number and send the mix-in fee from
              their bank — then tap “I’ve paid” in the app.
            </Text>

            <Text style={styles.label}>Bizum phone number</Text>
            <TextInput
              value={bizumPhone}
              onChangeText={setBizumPhone}
              keyboardType="phone-pad"
              placeholder="+34 600 000 000"
              placeholderTextColor={colors.textMuted}
              cursorColor={colors.accentGreen}
              selectionColor="rgba(200,255,46,0.28)"
              keyboardAppearance="dark"
              style={styles.input}
            />
            <Text style={styles.label}>Name on Bizum (optional)</Text>
            <TextInput
              value={bizumName}
              onChangeText={setBizumName}
              placeholder="Your name"
              placeholderTextColor={colors.textMuted}
              cursorColor={colors.accentGreen}
              selectionColor="rgba(200,255,46,0.28)"
              keyboardAppearance="dark"
              style={styles.input}
            />
            <Text style={styles.hint}>
              Bizum has no public payment link — players copy your number and pay from their banking
              app.
            </Text>
          </View>
        ) : null}

        <View style={styles.fields}>
          <Text style={styles.label}>Note to players (optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Put mix-in title in the payment reference"
            placeholderTextColor={colors.textMuted}
            cursorColor={colors.accentGreen}
            selectionColor="rgba(200,255,46,0.28)"
            keyboardAppearance="dark"
            underlineColorAndroid="transparent"
            style={[styles.input, { minHeight: 72, textAlignVertical: 'top' }]}
            multiline
          />
        </View>

        <Pressable
          style={[styles.save, saving && { opacity: 0.5 }]}
          onPress={() => {
            void tap();
            void onSave();
          }}
          disabled={saving}
        >
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save payment settings'}</Text>
        </Pressable>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intro: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  method: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  methodOn: {
    borderColor: colors.accentGreen,
    backgroundColor: colors.accentGreenDim,
  },
  methodDisabled: { opacity: 0.45 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioOn: {
    borderColor: colors.accentGreen,
    backgroundColor: colors.accentGreen,
  },
  methodTitle: {
    fontFamily: 'Figtree_700Bold',
    color: colors.textPrimary,
    fontSize: 16,
  },
  methodBody: {
    fontFamily: 'Figtree_400Regular',
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  guide: {
    gap: 8,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.22)',
  },
  guideTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 15,
    color: colors.accentGreen,
    marginBottom: 4,
  },
  step: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  em: {
    fontFamily: 'Figtree_700Bold',
    color: colors.textPrimary,
  },
  linkBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 6,
  },
  linkBtnText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 13,
    color: colors.accentGreen,
  },
  fields: { gap: 8 },
  label: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  input: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    fontFamily: 'Figtree_400Regular',
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  hint: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
  save: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontFamily: 'Figtree_700Bold',
    color: '#0B0D10',
    fontSize: 16,
  },
});
