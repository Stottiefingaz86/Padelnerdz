import { colors } from '@padel-nerdz/config';
import { useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  /** Chronological results: 1 = win, 0 = loss */
  series: number[];
  height?: number;
  /** px per result — enables horizontal scroll when series is long */
  pointWidth?: number;
  selectedIndex?: number | null;
  onSelectIndex?: (index: number) => void;
};

/**
 * Scrollable W/L form line — tap a point to inspect that result.
 */
export function WinLossSparkline({
  series,
  height = 96,
  pointWidth = 36,
  selectedIndex = null,
  onSelectIndex,
}: Props) {
  const [viewportW, setViewportW] = useState(0);

  const chartW = Math.max(viewportW, series.length * pointWidth);

  const points = useMemo(() => {
    if (series.length === 0 || chartW <= 0) return [] as { x: number; y: number }[];
    const padX = 10;
    const padY = 14;
    const usableW = Math.max(1, chartW - padX * 2);
    const usableH = Math.max(1, height - padY * 2);

    let wins = 0;
    const rates = series.map((v, i) => {
      wins += v >= 0.5 ? 1 : 0;
      return wins / (i + 1);
    });

    return rates.map((rate, i) => {
      const x =
        series.length === 1
          ? chartW / 2
          : padX + (i / Math.max(1, rates.length - 1)) * usableW;
      const y = padY + (1 - rate) * usableH;
      return { x, y };
    });
  }, [series, chartW, height]);

  function onLayout(e: LayoutChangeEvent) {
    setViewportW(e.nativeEvent.layout.width);
  }

  if (series.length < 1) {
    return (
      <View style={[styles.empty, { minHeight: height }]} onLayout={onLayout}>
        <Text style={styles.emptyTitle}>No form yet</Text>
        <Text style={styles.emptyBody}>
          Play a mix-in and this chart fills with your recent win rate.
        </Text>
      </View>
    );
  }

  return (
    <View onLayout={onLayout} style={styles.outer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        bounces
        contentContainerStyle={{ minWidth: chartW }}
      >
        <View style={[styles.wrap, { height, width: chartW }]}>
          <View style={[styles.midline, { top: height / 2 }]} />

          {points.map((p, i) => {
            if (i === 0) return null;
            const a = points[i - 1]!;
            const b = p;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
            return (
              <View
                key={`seg-${i}`}
                style={[
                  styles.seg,
                  {
                    width: len,
                    left: (a.x + b.x) / 2 - len / 2,
                    top: (a.y + b.y) / 2 - 1.25,
                    transform: [{ rotate: `${angle}deg` }],
                  },
                ]}
              />
            );
          })}

          {points.map((p, i) => {
            const selected = selectedIndex === i;
            const win = series[i]! >= 0.5;
            return (
              <Pressable
                key={`dot-${i}`}
                hitSlop={10}
                onPress={() => onSelectIndex?.(i)}
                style={[
                  styles.dotHit,
                  {
                    left: p.x - 12,
                    top: p.y - 12,
                  },
                ]}
              >
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: win ? colors.accentGreen : colors.textMuted,
                      transform: [{ scale: selected ? 1.35 : 1 }],
                      borderColor: selected ? colors.textPrimary : colors.elevated,
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <Text style={styles.hint}>Swipe to browse · tap a point</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { width: '100%', gap: 6 },
  wrap: {
    position: 'relative',
    overflow: 'hidden',
  },
  empty: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderStyle: 'dashed',
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 6,
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 14,
    color: colors.textPrimary,
  },
  emptyBody: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  midline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  seg: {
    position: 'absolute',
    height: 2.5,
    backgroundColor: colors.accentGreen,
    borderRadius: 2,
  },
  dotHit: {
    position: 'absolute',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  hint: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 11,
    color: colors.textMuted,
  },
});
