import { colors } from '@padel-nerdz/config';
import { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');
const PALETTE = [colors.accentGreen, '#FFD279', '#FF8A7A', '#6BFFB0', '#FFFFFF', '#B8FF6A'];

type Piece = {
  id: number;
  x: number;
  color: string;
  size: number;
  delay: number;
  drift: number;
  spin: number;
};

function ConfettiPiece({ piece }: { piece: Piece }) {
  const y = useSharedValue(-40);
  const x = useSharedValue(piece.x);
  const opacity = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    y.value = withDelay(
      piece.delay,
      withTiming(H * 0.85 + Math.random() * 80, {
        duration: 2200 + Math.random() * 900,
        easing: Easing.out(Easing.quad),
      }),
    );
    x.value = withDelay(
      piece.delay,
      withTiming(piece.x + piece.drift, {
        duration: 2400,
        easing: Easing.inOut(Easing.sin),
      }),
    );
    rotate.value = withDelay(
      piece.delay,
      withTiming(piece.spin, { duration: 2200, easing: Easing.linear }),
    );
    opacity.value = withDelay(
      piece.delay + 1400,
      withTiming(0, { duration: 900 }),
    );
  }, [piece, opacity, rotate, x, y]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: piece.size,
          height: piece.size * 0.45,
          backgroundColor: piece.color,
          borderRadius: 2,
        },
        style,
      ]}
    />
  );
}

/** Lightweight confetti overlay — no extra deps. */
export function ConfettiBurst({ count = 48 }: { count?: number }) {
  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * W,
        color: PALETTE[i % PALETTE.length]!,
        size: 8 + Math.random() * 10,
        delay: Math.floor(Math.random() * 280),
        drift: (Math.random() - 0.5) * 140,
        spin: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360),
      })),
    [count],
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p) => (
        <ConfettiPiece key={p.id} piece={p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
