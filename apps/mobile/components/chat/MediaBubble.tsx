import { colors } from '@padel-nerdz/config';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlatVideoIcon } from '@/components/FlatIcons';
import { tap } from '@/lib/feedback';
import { resolveMediaDisplayUrl } from '@/lib/media';

type Props = {
  uri?: string | null;
  /** Storage path preferred over ephemeral signed uri */
  path?: string | null;
  kind: 'image' | 'video';
  sender?: string | null;
  mine?: boolean;
  createdAt: string;
};

/** Reliable local/remote media bubble, resolves private storage to signed URLs. */
export function MediaBubble({ uri, path, kind, sender, mine, createdAt }: Props) {
  const [displayUri, setDisplayUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const resolved = await resolveMediaDisplayUrl(path || uri);
      if (!cancelled) {
        setDisplayUri(resolved);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [path, uri]);

  const source = displayUri ? { uri: displayUri } : null;

  function openViewer() {
    if (!source || kind === 'video') return;
    void tap();
    setOpen(true);
  }

  function closeViewer() {
    void tap();
    setOpen(false);
  }

  return (
    <>
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        {!mine && sender ? <Text style={styles.sender}>{sender}</Text> : null}
        {loading ? (
          <View style={[styles.frame, styles.loading]}>
            <ActivityIndicator color={colors.accentGreen} />
          </View>
        ) : source ? (
          <Pressable
            onPress={openViewer}
            disabled={kind === 'video'}
            style={styles.frame}
            accessibilityRole={kind === 'image' ? 'imagebutton' : 'image'}
            accessibilityLabel={kind === 'video' ? 'Video' : 'Photo, tap to enlarge'}
          >
            <Image source={source} style={styles.image} resizeMode="cover" />
            {kind === 'video' ? (
              <View style={styles.badge}>
                <FlatVideoIcon color={colors.textPrimary} size={14} />
                <Text style={styles.badgeText}>Video</Text>
              </View>
            ) : null}
          </Pressable>
        ) : (
          <Text style={styles.fallback}>{kind === 'video' ? 'Video' : 'Photo'}</Text>
        )}
        <Text style={styles.time}>
          {new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeViewer}
      >
        <View style={styles.viewer}>
          <Pressable
            style={[styles.close, { top: insets.top + 12 }]}
            onPress={closeViewer}
            hitSlop={16}
          >
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
          {source ? (
            <Image
              source={source}
              style={{ width, height: height * 0.75 }}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    padding: 8,
    gap: 6,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(200,255,46,0.12)',
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.elevated,
  },
  sender: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 12,
    color: colors.accentGreen,
    marginLeft: 4,
  },
  frame: {
    width: 220,
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  loading: { alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 12,
    color: colors.textPrimary,
  },
  fallback: {
    fontFamily: 'Figtree_400Regular',
    color: colors.textSecondary,
    padding: 12,
  },
  time: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 11,
    color: colors.textMuted,
    alignSelf: 'flex-end',
    marginRight: 4,
  },
  viewer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {
    position: 'absolute',
    right: 20,
    zIndex: 2,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  closeText: {
    fontFamily: 'Figtree_600SemiBold',
    color: '#fff',
    fontSize: 15,
  },
});

// silence unused Platform on some platforms
void Platform;
