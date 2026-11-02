import { colors } from '@padel-nerdz/config';
import { StyleSheet, Text, View } from 'react-native';

const TINTS = ['#C8FF2E', '#9BE05A', '#FFD279', '#FF8A7A', '#B8FF6A', '#6BFFB0'];

function tintFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash + seed.charCodeAt(i) * (i + 1)) % 997;
  return TINTS[hash % TINTS.length];
}

/** Perfect circle initials avatar, never a squircle. */
export function Avatar({
  name,
  size = 48,
  color,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const bg = color ?? tintFor(name);
  const fontSize = Math.round(size * 0.38);

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
        },
      ]}
    >
      <Text style={[styles.letter, { fontSize, lineHeight: fontSize + 2 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  letter: {
    color: colors.background,
    fontFamily: 'Figtree_700Bold',
  },
});
