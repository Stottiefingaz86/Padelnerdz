import { colors, spacing, typography } from '@padel-nerdz/config';
import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard, StyleSheet, Text } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AuthShell } from '@/components/AuthShell';
import { PhoneInput } from '@/components/PhoneInput';
import { useAuth } from '@/lib/auth';
import { success, warn } from '@/lib/feedback';
import { COUNTRIES, toE164, validateNational, type CountryOption } from '@/lib/phone';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

function isSmsUnsupported(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes('unsupported') ||
    m.includes('phone provider') ||
    (m.includes('sms') && m.includes('not')) ||
    m.includes('phone logins are disabled') ||
    m.includes('phone signup is disabled') ||
    m.includes('twilio') ||
    m.includes('error sending confirmation') ||
    m.includes('sms could not be sent')
  );
}

/** Device-only accounts without SMS — OFF for real beta / friends. */
function allowLocalPhoneFallback() {
  return process.env.EXPO_PUBLIC_ALLOW_LOCAL_PHONE_FALLBACK === 'true';
}

export default function PhoneScreen() {
  const { signUpWithPhoneLocal } = useAuth();
  const [country, setCountry] = useState<CountryOption>(COUNTRIES[0]);
  const [national, setNational] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function finishLocalSignup(e164: string) {
    const account = await signUpWithPhoneLocal(e164);
    void success();
    if (account.onboarding_completed) {
      router.replace('/(tabs)/chats');
    } else {
      router.replace('/(onboarding)/profile');
    }
  }

  async function onNext() {
    Keyboard.dismiss();
    setError(undefined);

    const validationError = validateNational(country, national);
    if (validationError) {
      void warn();
      setError(validationError);
      return;
    }

    const e164 = toE164(country.dial, national);
    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        if (!allowLocalPhoneFallback()) {
          void warn();
          setError(
            'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL / ANON_KEY, or only for solo demos set EXPO_PUBLIC_ALLOW_LOCAL_PHONE_FALLBACK=true.',
          );
          return;
        }
        await finishLocalSignup(e164);
        return;
      }

      const { error: otpError } = await getSupabase().auth.signInWithOtp({ phone: e164 });
      if (otpError) {
        if (isSmsUnsupported(otpError.message)) {
          if (allowLocalPhoneFallback()) {
            // Solo device demo only — NOT for beta friends (no real auth / shared data)
            await finishLocalSignup(e164);
            return;
          }
          void warn();
          setError(
            'SMS OTP is not available. Wire Twilio Verify in Supabase Auth → Phone before inviting real users. (Local fallback is disabled.)',
          );
          return;
        }
        void warn();
        setError(otpError.message);
        return;
      }

      void success();
      router.push({ pathname: '/(auth)/otp', params: { phone: e164 } });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Your phone number"
      subtitle="We’ll text you a code to verify this number. Real accounts require Twilio + Supabase Phone Auth."
      onBack={() => router.back()}
      footer={<AppButton label="Continue" onPress={onNext} loading={loading} />}
    >
      <PhoneInput
        country={country}
        national={national}
        autoFocus
        onCountryChange={setCountry}
        onNationalChange={(value) => {
          setNational(value);
          if (error) setError(undefined);
        }}
        error={error}
      />
      <Text style={styles.hint}>
        Spain: keep +34 and type 612345678 — don’t add the country code again.
      </Text>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
});
