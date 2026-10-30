import { TextField } from '@padel-nerdz/ui';
import { colors, spacing, typography } from '@padel-nerdz/config';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Keyboard, StyleSheet, Text } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AuthShell } from '@/components/AuthShell';
import { useAuth } from '@/lib/auth';
import { success, warn } from '@/lib/feedback';
import { getSupabase } from '@/lib/supabase';

function isSmsUnsupported(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes('unsupported') ||
    m.includes('phone provider') ||
    (m.includes('sms') && m.includes('not')) ||
    m.includes('twilio')
  );
}

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { signUpWithPhoneLocal, adoptSupabaseSession } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function useLocalInstead() {
    if (!phone) return;
    const account = await signUpWithPhoneLocal(phone);
    void success();
    router.replace(account.onboarding_completed ? '/(tabs)/chats' : '/(onboarding)/profile');
  }

  async function verify() {
    Keyboard.dismiss();
    setError(undefined);
    if (code.trim().length < 6) {
      setError('Enter the 6-digit code from your SMS');
      return;
    }
    setLoading(true);
    try {
      const { data, error: verifyError } = await getSupabase().auth.verifyOtp({
        phone: phone!,
        token: code.trim(),
        type: 'sms',
      });
      if (verifyError) {
        void warn();
        if (isSmsUnsupported(verifyError.message)) {
          await useLocalInstead();
          return;
        }
        setError(verifyError.message);
        return;
      }

      const session = data.session;
      if (!session) {
        // Rare: tokens in storage but no session object — pull once
        const { data: again } = await getSupabase().auth.getSession();
        if (!again.session) {
          setError('Signed in, but session didn’t stick. Try Verify again.');
          return;
        }
        const profile = await adoptSupabaseSession(again.session);
        void success();
        router.replace(
          profile?.onboarding_completed ? '/(tabs)/chats' : '/(onboarding)/profile',
        );
        return;
      }

      const profile = await adoptSupabaseSession(session);
      void success();
      // Go straight to onboarding/chats — don’t bounce via `/` (race → auth again)
      router.replace(
        profile?.onboarding_completed ? '/(tabs)/chats' : '/(onboarding)/profile',
      );
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    Keyboard.dismiss();
    setError(undefined);
    setLoading(true);
    try {
      const { error: otpError } = await getSupabase().auth.signInWithOtp({ phone: phone! });
      if (otpError) {
        void warn();
        if (isSmsUnsupported(otpError.message)) {
          await useLocalInstead();
          return;
        }
        setError(otpError.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Enter the code"
      subtitle={`We sent a 6-digit code to ${phone}.`}
      onBack={() => router.back()}
      footer={
        <>
          <AppButton label="Verify" onPress={verify} loading={loading} />
          <AppButton
            label="Continue without SMS"
            variant="ghost"
            onPress={() => void useLocalInstead()}
            style={styles.ghost}
          />
        </>
      }
    >
      <TextField
        label="6-digit code"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        placeholder="••••••"
        maxLength={6}
        autoFocus
        error={error}
      />
      <AppButton label="Resend SMS" variant="ghost" onPress={resend} />
      <Text style={styles.hint}>
        No SMS yet? Continue without SMS keeps this number as your account on this device.
      </Text>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
  ghost: {
    marginTop: spacing.sm,
  },
});
