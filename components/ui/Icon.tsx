import { Platform } from 'react-native';
import { SymbolView, SymbolWeight } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';
import {
  Activity, Armchair, ArrowDownRight, ArrowRight, ArrowUp, ArrowUpRight, Building2, Calendar, Camera, ChartLine, Check,
  ChevronLeft, ChevronRight, Cigarette, Copy, Eye, EyeOff, FileText, LucideIcon, MessageCircle, Moon, Pencil, Plus,
  RefreshCw, Scan, Sun, User, Users, X,
} from 'lucide-react-native';

// No iOS usam-se os SF Symbols do sistema (o desenho da Apple, com o peso do
// texto ao lado). No Android, o equivalente em Lucide.
const ICONS = {
  back: { sf: 'chevron.left', other: ChevronLeft },
  chevron: { sf: 'chevron.right', other: ChevronRight },
  arrow: { sf: 'arrow.right', other: ArrowRight },
  send: { sf: 'arrow.up', other: ArrowUp },
  up: { sf: 'arrow.up.right', other: ArrowUpRight },
  down: { sf: 'arrow.down.right', other: ArrowDownRight },
  camera: { sf: 'camera.fill', other: Camera },
  doc: { sf: 'doc.text.fill', other: FileText },
  pencil: { sf: 'pencil', other: Pencil },
  check: { sf: 'checkmark', other: Check },
  plus: { sf: 'plus', other: Plus },
  copy: { sf: 'doc.on.doc.fill', other: Copy },
  calendar: { sf: 'calendar', other: Calendar },
  sun: { sf: 'sun.max.fill', other: Sun },
  frame: { sf: 'viewfinder', other: Scan },
  close: { sf: 'xmark', other: X },
  retry: { sf: 'arrow.clockwise', other: RefreshCw },
  eye: { sf: 'eye.fill', other: Eye },
  eyeOff: { sf: 'eye.slash.fill', other: EyeOff },
  person: { sf: 'person.fill', other: User },
  people: { sf: 'person.2.fill', other: Users },
  lab: { sf: 'building.2.fill', other: Building2 },
  chat: { sf: 'bubble.left.fill', other: MessageCircle },
  chart: { sf: 'chart.line.uptrend.xyaxis', other: ChartLine },
  exercise: { sf: 'figure.run', other: Activity },
  sleep: { sf: 'moon.fill', other: Moon },
  sitting: { sf: 'chair.fill', other: Armchair },
  smoke: { sf: 'lungs.fill', other: Cigarette },
} satisfies Record<string, { sf: SFSymbol; other: LucideIcon }>;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  color: string;
  weight?: SymbolWeight;
}

export function Icon({ name, size = 22, color, weight = 'semibold' }: IconProps) {
  const { sf, other: Other } = ICONS[name];
  const fallback = <Other size={size} color={color} strokeWidth={2} />;
  if (Platform.OS !== 'ios') return fallback;
  return (
    <SymbolView
      name={sf}
      size={size}
      tintColor={color}
      weight={weight}
      type="monochrome"
      resizeMode="scaleAspectFit"
      fallback={fallback}
      style={{ width: size, height: size }}
    />
  );
}
