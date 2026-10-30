import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@padel-nerdz/config';

import { useAuth } from '@/lib/auth';

export default function Index() {
  const { ready, session, profile } = useAuth();

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accentGreen} />
      </View>
    );
  }

  const signedIn = Boolean(
    session?.user || profile?.id === 'guest' || profile?.id?.startsWith('local_'),
  );
  if (!signedIn) return <Redirect href="/(auth)" />;
  // Supabase session with profile still loading → stay on onboarding path, not auth
  if (!profile?.onboarding_completed) return <Redirect href="/(onboarding)/profile" />;
  return <Redirect href="/(tabs)/chats" />;
}
