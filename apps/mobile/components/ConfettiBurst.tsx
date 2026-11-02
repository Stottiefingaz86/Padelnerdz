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
  y0: number;
  color: string;
  w: number;
  h: number;
  delay: number;
  drift: number;
  spin: number;
  fall: number;
  round: number;
};

function ConfettiPiece({ piece }: { piece: Piece }) {
  const y = useSharedValue(piece.y0);
  const x = useSharedValue(piece.x);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withDelay(piece.delay, withTiming(1, { duration: 90 }));
    scale.value = withDelay(
      piece.delay,
      withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }),
    );
    y.value = withDelay(
      piece.delay,
      withTiming(piece.y0 + piece.fall, {
        duration: 2200 + Math.random() * 800,
        easing: Easing.out(Easing.quad),
      }),
    );
    x.value = withDelay(
      piece.delay,
      withTiming(piece.x + piece.drift, {
        duration: 2300,
        easing: Easing.inOut(Easing.sin),
      }),
    );
    rotate.value = withDelay(
      piece.delay,
      withTiming(piece.spin, { duration: 2100, easing: Easing.linear }),
    );
    opacity.value = withDelay(piece.delay + 1500, withTiming(0, { duration: 700 }));
  }, [piece, opacity, rotate, scale, x, y]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: piece.w,
          height: piece.h,
          backgroundColor: piece.color,
          borderRadius: piece.round,
        },
        style,
      ]}
    />
  );
}

/** Full-viewport confetti burst, intended to sit above celebration UI. */
export function ConfettiBurst({ count = 120 }: { count?: number }) {
  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: count }, (_, i) => {
        const burst = i < count * 0.55;
        const size = 7 + Math.random() * 11;
        return {
          id: i,
          x: burst ? W * 0.5 + (Math.random() - 0.5) * W * 0.35 : Math.random() * W,
          y0: burst ? H * 0.38 + (Math.random() - 0.5) * 40 : -40 - Math.random() * 120,
          color: PALETTE[i % PALETTE.length]!,
          w: size,
          h: size * (0.35 + Math.random() * 0.55),
          delay: Math.floor(Math.random() * 180),
          drift: (Math.random() - 0.5) * (burst ? 280 : 140),
          spin: (Math.random() > 0.5 ? 1 : -1) * (260 + Math.random() * 480),
          fall: H * (0.45 + Math.random() * 0.55),
          round: Math.random() > 0.7 ? size / 2 : 2,
        };
      }),
    [count],
  );

  return (
    <View pointerEvents="none" style={styles.layer}>
      {pieces.map((p) => (
        <ConfettiPiece key={p.id} piece={p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    overflow: 'visible',
  },
  piece: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
