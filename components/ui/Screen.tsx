import { ReactNode } from 'react';
import { RefreshControlProps, StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Extrapolation, FadeIn, FadeOut, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MASCOT_COLORS, Tone, useTheme, VIVID } from '@/constants/theme';

interface GlowSpec {
  /** Centro e raio em fração da largura do ecrã (y também em larguras). */
  cx: number;
  cy: number;
  r: number;
  tone: Tone;
  alpha: number;
}

function glowsFor(tone: Tone): GlowSpec[] {
  // O tom do ecrã domina em cima e em baixo; o lilás da marca fica sempre ao meio.
  const second: Tone = tone === 'none' ? 'att' : 'none';
  // Manchas largas e bem visíveis: é a cor por trás que faz o vidro parecer vidro.
  return [
    { cx: 0.7, cy: 0.62, r: 0.62, tone, alpha: 0.72 },
    { cx: 0.05, cy: 1.5, r: 0.56, tone: second, alpha: tone === 'none' ? 0.34 : 0.55 },
    { cx: 0.9, cy: 2.0, r: 0.6, tone, alpha: 0.5 },
    { cx: 0.1, cy: 0.2, r: 0.4, tone: second, alpha: 0.22 },
  ];
}

function Glows({ tone }: { tone: Tone }) {
  const t = useTheme();
  const { width, height } = useWindowDimensions();
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        {glowsFor(tone).map((g, i) => (
          <RadialGradient key={i} id={`glow${i}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={(t.dark ? VIVID : MASCOT_COLORS)[g.tone]} stopOpacity={g.alpha * t.glowAlpha} />
            <Stop offset="0.68" stopColor={(t.dark ? VIVID : MASCOT_COLORS)[g.tone]} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>
      {glowsFor(tone).map((g, i) => (
        <Circle key={i} cx={g.cx * width} cy={g.cy * width} r={g.r * width} fill={`url(#glow${i})`} />
      ))}
    </Svg>
  );
}

/** Fundo da app: degradé do tema com manchas de cor que seguem o tom (estado) do ecrã. */
export function Backdrop({ tone = 'none' }: { tone?: Tone | null }) {
  const t = useTheme();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={t.bg} style={StyleSheet.absoluteFill} />
      {/* A chave faz a mancha antiga desvanecer enquanto a nova entra. Sem tom (dados por carregar) não há manchas. */}
      {tone === null ? null : <Animated.View
        key={`${tone}-${t.dark}`}
        entering={FadeIn.duration(700)}
        exiting={FadeOut.duration(700)}
        style={StyleSheet.absoluteFill}
      >
        <Glows tone={tone} />
      </Animated.View>}
    </View>
  );
}

interface ScreenProps {
  children: ReactNode;
  /** null: ainda não se sabe o estado; o fundo fica liso. */
  tone?: Tone | null;
  /** false para ecrãs com layout fixo (conversa, boas-vindas). */
  scroll?: boolean;
  /** Conteúdo fixo por cima do scroll, ancorado em baixo (botão principal). */
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  /** Espaço em cima além da área segura. */
  top?: number;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  /** Ecrã dentro das tabs: o menu nativo trata da margem de baixo. */
  inTabs?: boolean;
  /** false trava o scroll (enquanto se arrasta o boneco). */
  scrollEnabled?: boolean;
}

export function Screen({ children, tone = 'none', scroll = true, footer, contentStyle, top = 12, refreshControl, inTabs, scrollEnabled = true }: ScreenProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  // Só aparece depois de se começar a deslizar: em repouso o fundo fica como está.
  const statusFadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 24], [0, 1], Extrapolation.CLAMP),
  }));
  const paddingTop = insets.top + top;
  // Dentro das tabs deixa-se espaço para o menu flutuante; fora, para o indicador de início.
  const paddingBottom = footer ? 120 + insets.bottom : inTabs ? 110 : insets.bottom + 28;
  return (
    <View style={styles.root}>
      <Backdrop tone={tone} />
      {scroll ? (
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[styles.content, { paddingTop, paddingBottom }, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          refreshControl={refreshControl}
          scrollEnabled={scrollEnabled}
        >
          {children}
        </Animated.ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, { paddingTop, paddingBottom: footer ? paddingBottom : insets.bottom }, contentStyle]}>
          {children}
        </View>
      )}
      {scroll ? (
        // O conteúdo que desliza desvanece por baixo do relógio, em vez de se misturar com ele.
        <Animated.View pointerEvents="none" style={[styles.statusFade, { height: insets.top + 16 }, statusFadeStyle]}>
          <LinearGradient colors={[t.bg[0], `${t.bg[0]}00`]} locations={[0.6, 1]} style={StyleSheet.absoluteFill} />
        </Animated.View>
      ) : null}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]} pointerEvents="box-none">
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  content: { paddingHorizontal: 24 },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 0, gap: 6 },
  statusFade: { position: 'absolute', left: 0, right: 0, top: 0 },
});
