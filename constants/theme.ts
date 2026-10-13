import { useColorScheme } from 'react-native';
import { AttentionLevel } from '@/lib/types';

/** Tom de um ecrã ou elemento: segue o nível de atenção, ou lilás quando não há dados. */
export type Tone = 'none' | 'ok' | 'watch' | 'att' | 'out';

export const TONE_BY_LEVEL: Record<AttentionLevel, Tone> = {
  dentro_do_esperado: 'ok',
  a_acompanhar: 'watch',
  merece_atencao: 'att',
  fora_do_range: 'out',
};

/** Nome do boneco. Aparece na conversa e na apresentação; muda-se só aqui. */
export const MASCOT_NAME = 'Lino';

/** Cor do boneco por tom (igual em claro e escuro): a cor forte de cada estado. */
export const MASCOT_COLORS: Record<Tone, string> = {
  none: '#9384F0',
  ok: '#35B584',
  watch: '#E8AC27',
  att: '#E67C45',
  out: '#E66A63',
};

/** Cor viva de cada tom, para as manchas do fundo no modo escuro. */
export const VIVID: Record<Tone, string> = MASCOT_COLORS;

/**
 * Cor dos cartões de destaque: a versão mais suave de cada tom (o boneco fica
 * com a forte). É clara, por isso o texto por cima é escuro.
 */
export const CARD_TINT: Record<Tone, string> = {
  none: '#A99DF6',
  ok: '#7FD9B3',
  watch: '#F2CF7A',
  att: '#F5A873',
  out: '#F08B86',
};

/** Texto por cima dos cartões de destaque. */
export const ON_VIVID = '#1B1420';

export const MASCOT_EYES: Record<Tone, string> = {
  none: '#14112B',
  ok: '#10201A',
  watch: '#1F1A0C',
  att: '#1B1420',
  out: '#200F10',
};

interface TintColors {
  from: string;
  to: string;
  label: string;
  body: string;
}

export interface Theme {
  dark: boolean;
  bg: [string, string];
  ink: string;
  sub: string;
  link: string;
  /** Cartão de vidro: degradé por cima do desfoque. */
  glass: [string, string];
  glassBorder: string;
  glassShadow: number;
  chip: string;
  primaryBg: string;
  primaryFg: string;
  selected: string;
  hairline: string;
  track: string;
  okZone: string;
  outZone: string;
  ring: string;
  pill: string;
  pillFg: string;
  paper: string;
  logo: { main: string; accent: string };
  /** Texto por nível, com contraste para o fundo do tema. */
  level: Record<Tone, string>;
  /** Pontos, marcadores e traços de gráfico por nível. */
  dot: Record<Tone, string>;
  tint: Record<Tone, TintColors>;
  tintBorder: string;
  glowAlpha: number;
  blur: 'light' | 'dark';
}

const light: Theme = {
  dark: false,
  bg: ['#F8F7FB', '#ECEAF2'],
  ink: '#15131F',
  sub: '#5E5B6E',
  link: '#5848D4',
  glass: ['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.24)'],
  glassBorder: 'rgba(255,255,255,0.35)',
  glassShadow: 0.07,
  chip: 'rgba(255,255,255,0.58)',
  primaryBg: '#15131F',
  primaryFg: '#FFFFFF',
  selected: 'rgba(21,19,31,0.08)',
  hairline: 'rgba(21,19,31,0.08)',
  track: 'rgba(21,19,31,0.08)',
  okZone: 'rgba(47,168,119,0.46)',
  outZone: 'rgba(240,138,75,0.32)',
  ring: '#FFFFFF',
  pill: '#FFFFFF',
  pillFg: '#15131F',
  paper: '#FFFFFF',
  logo: { main: '#5848D4', accent: '#A99DF6' },
  level: { ok: '#1F7A55', watch: '#7A5600', att: '#9C430F', out: '#A8322D', none: '#5848D4' },
  dot: { ok: '#2FA877', watch: '#E0A21A', att: '#F08A4B', out: '#E0605A', none: '#8B7BEA' },
  tint: {
    att: { from: 'rgba(255,232,216,0.80)', to: 'rgba(255,196,156,0.68)', label: '#8A3D0E', body: '#3A2A20' },
    watch: { from: 'rgba(255,243,214,0.80)', to: 'rgba(250,220,150,0.68)', label: '#6B4C00', body: '#3A3020' },
    out: { from: 'rgba(255,228,226,0.80)', to: 'rgba(250,180,176,0.68)', label: '#8F2A26', body: '#3A2222' },
    ok: { from: 'rgba(222,247,236,0.80)', to: 'rgba(160,228,196,0.68)', label: '#17603F', body: '#1F3A2E' },
    none: { from: 'rgba(236,232,255,0.80)', to: 'rgba(200,190,250,0.68)', label: '#3F3399', body: '#2B2740' },
  },
  tintBorder: 'transparent',
  glowAlpha: 1,
  blur: 'light',
};

const dark: Theme = {
  dark: true,
  bg: ['#100E1C', '#050409'],
  ink: '#F3F2F8',
  sub: '#C9C5DC',
  link: '#C9C0FF',
  glass: ['rgba(70,62,112,0.42)', 'rgba(20,17,34,0.36)'],
  glassBorder: 'rgba(255,255,255,0.12)',
  glassShadow: 0.38,
  chip: 'rgba(46,43,66,0.60)',
  primaryBg: '#F3F2F8',
  primaryFg: '#14112B',
  selected: 'rgba(255,255,255,0.13)',
  hairline: 'rgba(255,255,255,0.10)',
  track: 'rgba(255,255,255,0.10)',
  okZone: 'rgba(127,217,179,0.44)',
  outZone: 'rgba(245,168,115,0.34)',
  ring: '#201E2E',
  pill: '#F3F2F8',
  pillFg: '#14112B',
  paper: '#2B2941',
  logo: { main: '#A99DF6', accent: '#F4F1EA' },
  level: { ok: '#8FE0BD', watch: '#F2CF7A', att: '#F7B588', out: '#F5A19C', none: '#C9C0FF' },
  dot: { ok: '#7FD9B3', watch: '#F2CF7A', att: '#F5A873', out: '#F08B86', none: '#A99CF5' },
  tint: {
    att: { from: 'rgba(120,70,44,0.62)', to: 'rgba(58,36,34,0.60)', label: '#F9C7A3', body: '#EFEAF0' },
    watch: { from: 'rgba(112,88,30,0.62)', to: 'rgba(54,44,26,0.60)', label: '#F5DC9C', body: '#EFECE4' },
    out: { from: 'rgba(122,52,50,0.62)', to: 'rgba(58,30,34,0.60)', label: '#F8BDB9', body: '#F0E9EA' },
    ok: { from: 'rgba(40,104,80,0.62)', to: 'rgba(24,48,42,0.60)', label: '#A9E8CC', body: '#EAF2EE' },
    none: { from: 'rgba(80,70,150,0.62)', to: 'rgba(36,32,68,0.60)', label: '#D3CCFF', body: '#ECEAF6' },
  },
  tintBorder: 'transparent',
  glowAlpha: 0.62,
  blur: 'dark',
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Texto escuro para usar por cima das cores `dot` (etiquetas de valor nos gráficos). */
export const ON_DOT = '#1B1420';
