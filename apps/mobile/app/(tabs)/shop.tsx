import { colors, radii, spacing } from '@padel-nerdz/config';
import { Lock } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { NERDZ_MERCH } from '@/lib/shop';

const KIND_MARK: Record<(typeof NERDZ_MERCH)[number]['kind'], string> = {
  tee: 'TEE',
  hoodie: 'HDY',
  cap: 'CAP',
  sweatband: 'WR',
};

/** Shop tab stays visible, catalogue is locked behind Coming soon. */
export default function ShopScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + 40,
        },
      ]}
    >
      <View style={styles.hero}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>COMING SOON</Text>
        </View>
        <Text style={styles.title}>Shop</Text>
        <Text style={styles.sub}>
          Nerdz merch and racket picks land here. Browsing is locked until the drop opens.
        </Text>
      </View>

      <View style={styles.previewWrap} pointerEvents="none">
        <View style={styles.previewRow}>
          {NERDZ_MERCH.slice(0, 3).map((item) => (
            <View key={item.id} style={styles.merchCard}>
              <View style={styles.merchArt}>
                <Text style={styles.merchArtMark}>{KIND_MARK[item.kind]}</Text>
              </View>
              <Text style={styles.merchName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.price}>{item.priceLabel}</Text>
            </View>
          ))}
        </View>
        <View style={styles.lockOverlay}>
          <Icon icon={Lock} color={colors.accentGreen} size="xl" />
          <Text style={styles.lockTitle}>Coming soon</Text>
          <Text style={styles.lockBody}>We’ll unlock Shop when merch and partners go live.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    gap: spacing.lg,
  },
  hero: { gap: 8 },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(200,255,46,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.4)',
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.accentGreen,
  },
  title: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 32,
    letterSpacing: -0.8,
    color: colors.textPrimary,
  },
  sub: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  previewWrap: {
    position: 'relative',
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.elevated,
    minHeight: 220,
  },
  previewRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    opacity: 0.35,
  },
  merchCard: {
    flex: 1,
    gap: 6,
  },
  merchArt: {
    height: 88,
    borderRadius: radii.md,
    backgroundColor: '#12151a',
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchArtMark: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 14,
    letterSpacing: 1,
    color: colors.accentGreen,
  },
  merchName: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 12,
    color: colors.textPrimary,
  },
  price: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 12,
    color: colors.textMuted,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 28,
    backgroundColor: 'rgba(8,10,12,0.55)',
  },
  lockTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 18,
    color: colors.textPrimary,
  },
  lockBody: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
