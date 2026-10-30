import { Image, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

type Props = {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  style?: StyleProp<ImageStyle>;
};

const SIZES = {
  sm: 72,
  md: 120,
  lg: 180,
  hero: 240,
} as const;

export function BrandLogo({ size = 'lg', style }: Props) {
  const width = SIZES[size];
  return (
    <Image
      source={require('../assets/branding/padel-nerdz-logo-white-cropped.png')}
      accessibilityLabel="Padel Nerdz"
      resizeMode="contain"
      style={[styles.logo, { width, height: width * 0.72 }, style]}
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    alignSelf: 'center',
  },
});
