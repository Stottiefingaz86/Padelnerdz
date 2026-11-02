import { type ReactNode } from 'react';
import { ImageBackground, StyleSheet } from 'react-native';

type Props = {
  children: ReactNode;
  /** Pattern fade, keep low so bubbles stay readable. */
  opacity?: number;
};

/**
 * Chat theme: pattern is drawn behind children via ImageBackground
 * (no absolute overlay / zIndex tricks).
 */
export function ChatWallpaper({ children, opacity = 0.12 }: Props) {
  return (
    <ImageBackground
      source={require('../../assets/images/chat-pattern.png')}
      style={styles.wrap}
      imageStyle={[styles.image, { opacity }]}
      resizeMode="cover"
    >
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  image: {
    // opacity applied inline
  },
});
