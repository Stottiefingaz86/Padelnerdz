import { SymbolView } from 'expo-symbols';
import { Platform, View } from 'react-native';

/** Native gear for headers — white, never lime. */
export function FlatSettingsIcon({
  color = '#FFFFFF',
  size = 22,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <SymbolView
        name={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }}
        tintColor={color}
        size={size}
        style={Platform.OS !== 'ios' ? { width: size, height: size } : undefined}
      />
    </View>
  );
}
