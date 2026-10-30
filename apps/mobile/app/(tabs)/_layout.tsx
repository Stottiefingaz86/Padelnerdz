import { colors } from '@padel-nerdz/config';
import { SymbolView } from 'expo-symbols';
import { Tabs, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { useAuth } from '@/lib/auth';
import { subscribeChat } from '@/lib/chat';
import { totalUnreadForGroups } from '@/lib/chat-read';
import { select } from '@/lib/feedback';
import { listMyGroups } from '@/lib/groups';
import { subscribeDemoStore } from '@/lib/demo-store';

export default function TabLayout() {
  const { profile, user, offline } = useAuth();
  const userId = user?.id ?? profile?.id ?? '';
  const [chatUnread, setChatUnread] = useState(0);

  const refreshBadges = useCallback(async () => {
    if (!userId) return;
    try {
      const groups = await listMyGroups(userId, offline);
      setChatUnread(await totalUnreadForGroups(groups.map((g) => g.id), userId));
    } catch {
      /* ignore badge failures */
    }
  }, [userId, offline]);

  useFocusEffect(
    useCallback(() => {
      void refreshBadges();
      const a = subscribeDemoStore(() => void refreshBadges());
      const b = subscribeChat(() => void refreshBadges());
      return () => {
        a();
        b();
      };
    }, [refreshBadges]),
  );

  return (
    <Tabs
      screenListeners={{
        tabPress: () => {
          void select();
        },
      }}
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerShown: false,
        headerShadowVisible: false,
        headerTintColor: colors.textPrimary,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.accentGreen,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          headerTitle: 'Chats',
          tabBarBadge: chatUnread > 0 ? chatUnread : undefined,
          tabBarBadgeStyle: styles.badge,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'bubble.left.and.bubble.right.fill', android: 'chat', web: 'chat' }}
              tintColor={color}
              size={24}
              style={Platform.OS !== 'ios' ? { width: 24, height: 24 } : undefined}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="play"
        options={{
          title: 'Play',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'tennisball.fill', android: 'sports_tennis', web: 'sports_tennis' }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'safari.fill', android: 'explore', web: 'explore' }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'person.crop.circle.fill', android: 'person', web: 'person' }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.borderSubtle,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingTop: 6,
  },
  tabLabel: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 11,
    letterSpacing: 0.1,
  },
  badge: {
    backgroundColor: colors.accentGreen,
    color: '#0B0D10',
    fontSize: 11,
    fontFamily: 'Figtree_700Bold',
  },
});
