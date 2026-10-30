import { colors } from '@padel-nerdz/config';
import { View } from 'react-native';

type IconProps = { color?: string; size?: number };

/** Flat monoline camera — no emoji. */
export function FlatCameraIcon({ color = colors.textSecondary, size = 22 }: IconProps) {
  const body = size * 0.55;
  const lens = size * 0.28;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: body * 1.35,
          height: body,
          borderRadius: 3,
          borderWidth: 1.75,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: lens,
            height: lens,
            borderRadius: lens / 2,
            borderWidth: 1.75,
            borderColor: color,
          }}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          top: size * 0.18,
          width: size * 0.22,
          height: size * 0.1,
          borderRadius: 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/** Flat monoline play triangle in a rectangle — no 3D emoji. */
export function FlatVideoIcon({ color = colors.textSecondary, size = 22 }: IconProps) {
  const w = size * 0.72;
  const h = size * 0.52;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: w,
          height: h,
          borderRadius: 3,
          borderWidth: 1.75,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 0,
            height: 0,
            marginLeft: 2,
            borderTopWidth: size * 0.1,
            borderBottomWidth: size * 0.1,
            borderLeftWidth: size * 0.16,
            borderTopColor: 'transparent',
            borderBottomColor: 'transparent',
            borderLeftColor: color,
          }}
        />
      </View>
    </View>
  );
}

/** Left chevron — geometrically centered (SF Symbol chevrons look optically off). */
export function FlatChevronLeft({ color = colors.accentGreen, size = 22 }: IconProps) {
  const thickness = Math.max(2.25, size * 0.11);
  const arm = size * 0.38;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: arm,
          height: arm,
          borderLeftWidth: thickness,
          borderBottomWidth: thickness,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
          marginRight: size * 0.06,
        }}
      />
    </View>
  );
}

export function FlatPlusIcon({ color = colors.textSecondary, size = 22 }: IconProps) {
  const stroke = Math.max(1.75, size * 0.1);
  const len = size * 0.55;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: len, height: stroke, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ position: 'absolute', width: stroke, height: len, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}

export function FlatSendIcon({ color = colors.background, size = 18 }: IconProps) {
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderTopWidth: size * 0.28,
        borderBottomWidth: size * 0.28,
        borderLeftWidth: size * 0.48,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: color,
        marginLeft: 2,
      }}
    />
  );
}

/** Filter / sliders glyph. */
export function FlatFilterIcon({ color = colors.textSecondary, size = 20 }: IconProps) {
  const stroke = Math.max(1.5, size * 0.09);
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', gap: size * 0.18 }}>
      <View style={{ height: stroke, width: size * 0.9, backgroundColor: color, borderRadius: 1, alignSelf: 'center' }} />
      <View style={{ height: stroke, width: size * 0.62, backgroundColor: color, borderRadius: 1, alignSelf: 'center' }} />
      <View style={{ height: stroke, width: size * 0.38, backgroundColor: color, borderRadius: 1, alignSelf: 'center' }} />
    </View>
  );
}

/** Location pin. */
export function FlatLocateIcon({ color = colors.textSecondary, size = 20 }: IconProps) {
  const outer = size * 0.72;
  const inner = size * 0.28;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: outer,
          height: outer,
          borderRadius: outer / 2,
          borderWidth: 1.75,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: size * 0.06,
        }}
      >
        <View
          style={{
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            backgroundColor: color,
          }}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.02,
          width: 0,
          height: 0,
          borderLeftWidth: size * 0.14,
          borderRightWidth: size * 0.14,
          borderTopWidth: size * 0.18,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: color,
        }}
      />
    </View>
  );
}
