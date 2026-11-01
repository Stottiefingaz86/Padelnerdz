/**
 * @deprecated Use `Icon` + lucide-react-native.
 * Thin Lucide re-exports so older imports keep working during migration.
 */
import { colors } from '@padel-nerdz/config';
import {
  Camera,
  ChevronLeft,
  MapPin,
  Plus,
  SendHorizontal,
  SlidersHorizontal,
  Video,
} from 'lucide-react-native';

import { Icon, type IconSize } from '@/components/Icon';

type IconProps = { color?: string; size?: number };

function toSize(size?: number): IconSize | number {
  return size ?? 'md';
}

export function FlatCameraIcon({ color = colors.textSecondary, size }: IconProps) {
  return <Icon icon={Camera} color={color} size={toSize(size)} />;
}

export function FlatVideoIcon({ color = colors.textSecondary, size }: IconProps) {
  return <Icon icon={Video} color={color} size={toSize(size)} />;
}

export function FlatChevronLeft({ color = colors.accentGreen, size }: IconProps) {
  return <Icon icon={ChevronLeft} color={color} size={toSize(size)} strokeWidth={2.25} />;
}

export function FlatPlusIcon({ color = colors.textSecondary, size }: IconProps) {
  return <Icon icon={Plus} color={color} size={toSize(size)} />;
}

export function FlatSendIcon({ color = colors.background, size = 18 }: IconProps) {
  return <Icon icon={SendHorizontal} color={color} size={size} />;
}

export function FlatFilterIcon({ color = colors.textSecondary, size }: IconProps) {
  return <Icon icon={SlidersHorizontal} color={color} size={toSize(size)} />;
}

export function FlatLocateIcon({ color = colors.textSecondary, size }: IconProps) {
  return <Icon icon={MapPin} color={color} size={toSize(size)} />;
}
