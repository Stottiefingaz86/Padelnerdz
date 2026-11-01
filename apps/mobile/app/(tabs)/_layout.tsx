import { colors } from '@padel-nerdz/config';
import { Tabs, useFocusEffect } from 'expo-router';
import { CircleUserRound, Compass, Inbox, MessageCircle } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { Icon } from '@/components/Icon';
import { TennisRacket } from '@/components/icons/TennisRacket';
import { useAuth } from '@/lib/auth';
import { subscribeChat } from '@/lib/chat';
import { totalUnreadForGroups } from '@/lib/chat-read';
import { countInboxBadge } from '@/lib/dm';
import { select } from '@/lib/feedback';
import { listFriendRequests, subscribeFriends } from '@/lib/friends';
import { listMyGroups } from '@/lib/groups';
import { subscribeDemoStore } from '@/lib/demo-store';

export default function TabLayout() {
  const { profile, user, offline } = useAuth();
  const userId = user?.id ?? profile?.id ?? '';
  const [chatUnread, setChatUnread] = useState(0);
  const [inboxUnread, setInboxUnread] = useState(0);

  const refreshBadges = useCallback(async () => {
    if (!userId) return;
    try {
      const groups = await listMyGroups(userId, offline);
      setChatUnread(await totalUnreadForGroups(groups.map((g) => g.id), userId));
      const reqs = await listFriendRequests(offline);
      setInboxUnread(await countInboxBadge(userId, offline, reqs.length));
    } catch {
      /* ignore badge failures */
    }
  }, [userId, offline]);

  useFocusEffect(
    useCallback(() => {
      void refreshBadges();
      const a = subscribeDemoStore(() => void refreshBadges());
      const b = subscribeChat(() => void refreshBadges());
      const c = subscribeFriends(() => void refreshBadges());
      return () => {
        a();
        b();
        c();
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
          tabBarIcon: ({ color }) => <Icon icon={MessageCircle} color={color} size="lg" />,
        }}
      />
      <Tabs.Screen
        name="play"
        options={{
          title: 'My Games',
          tabBarIcon: ({ color }) => <Icon icon={TennisRacket} color={color} size="lg" />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => <Icon icon={Compass} color={color} size="lg" />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarBadge: inboxUnread > 0 ? inboxUnread : undefined,
          tabBarBadgeStyle: styles.badge,
          tabBarIcon: ({ color }) => <Icon icon={Inbox} color={color} size="lg" />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          href: null,
          title: 'Shop',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Icon icon={CircleUserRound} color={color} size="lg" />,
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
