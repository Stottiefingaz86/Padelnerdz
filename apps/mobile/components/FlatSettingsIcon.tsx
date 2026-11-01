import { Settings } from 'lucide-react-native';

import { Icon } from '@/components/Icon';

/** Gear for headers — white by default, never lime. */
export function FlatSettingsIcon({
  color = '#FFFFFF',
  size = 22,
}: {
  color?: string;
  size?: number;
}) {
  return <Icon icon={Settings} color={color} size={size} />;
}
