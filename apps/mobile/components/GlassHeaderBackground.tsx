import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View } from 'react-native';

/**
 * Frosted glass behind stack headers.
 * Requires headerTransparent so content can blur underneath.
 */
export function GlassHeaderBackground() {
  if (Platform.OS === 'ios') {
    return (
      <View style={styles.fill}>
        <BlurView intensity={72} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.wash} />
        <View style={styles.hairline} />
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.fill, styles.web]}>
        <View style={styles.hairline} />
      </View>
    );
  }

  return (
    <View style={[styles.fill, styles.android]}>
      <View style={styles.hairline} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  wash: {
    ...StyleSheet.absoluteFill,
    // Light enough that BlurView reads as glass, dark enough for white titles
    backgroundColor: 'rgba(11, 13, 16, 0.42)',
  },
  web: {
    backgroundColor: 'rgba(20, 20, 20, 0.72)',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        } as object)
      : null),
  },
  android: {
    backgroundColor: 'rgba(15, 17, 21, 0.88)',
  },
  hairline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(200, 255, 46, 0.18)',
  },
});
