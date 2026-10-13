import { ReactNode } from 'react';
import { Platform, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { CARD_TINT, Tone, useTheme } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Liquid Glass do sistema (iOS 26 ou mais recente). Nos restantes usa-se desfoque com degradé. */
export const LIQUID_GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

interface PressableScaleProps {
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'checkbox' | 'link' | 'tab';
  accessibilityState?: { selected?: boolean; checked?: boolean; disabled?: boolean };
  hitSlop?: number;
  /** Quanto encolhe ao premir (1 = nada). */
  pressedScale?: number;
}

/** Botão que encolhe ligeiramente ao premir: a resposta tátil visual de toda a app. */
export function PressableScale({ style, children, pressedScale = 0.97, disabled, ...props }: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      {...props}
      disabled={disabled}
      onPressIn={() => { scale.value = withSpring(pressedScale, { damping: 20, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 14, stiffness: 300 }); }}
      style={[style, animated, disabled && { opacity: 0.5 }]}
    >
      {children}
    </AnimatedPressable>
  );
}

interface GlassProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Estilo do interior (padding, alinhamento). */
  contentStyle?: StyleProp<ViewStyle>;
  radius?: number;
  /** Com tom, o vidro fica colorido (cartões de destaque). */
  tone?: Tone;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Sem sombra, para elementos pequenos (chips, botões redondos). */
  flat?: boolean;
}

/** O vidro em si, a preencher o elemento pai: Liquid Glass quando existe, senão desfoque. */
export function GlassSurface({ radius, tone }: { radius: number; tone?: Tone }) {
  const t = useTheme();
  if (LIQUID_GLASS) {
    // O vidro do sistema é quase invisível sobre fundos claros: um leve tom
    // leitoso dá-lhe corpo. Com tom, é vidro da cor viva do estado.
    const neutral = t.dark ? 'rgba(34,28,62,0.50)' : 'rgba(255,255,255,0.30)';
    // O GlassView precisa de uma vista só para ele: posto diretamente como
    // camada absoluta (ou com pointerEvents) não chega a desenhar.
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <GlassView
          glassEffectStyle="regular"
          tintColor={tone ? `${CARD_TINT[tone]}E6` : neutral}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        />
        {/* Sem cor, é o rebordo luminoso que separa o vidro do fundo claro. Os cartões de cor viva não o levam. */}
        {tone ? null : (
          <View style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: 1, borderColor: t.dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.85)' }]} />
        )}
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.surface, { borderRadius: radius, borderColor: tone ? 'transparent' : t.glassBorder }]}>
      <BlurView intensity={t.dark ? 50 : 60} tint={t.blur} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={tone ? [`${CARD_TINT[tone]}F0`, `${CARD_TINT[tone]}DC`] : t.glass} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
    </View>
  );
}

/** Superfície de vidro: desfoque do que está por trás, degradé translúcido e rebordo luminoso. */
export function Glass({ children, style, contentStyle, radius = 26, tone, onPress, accessibilityLabel, flat }: GlassProps) {
  const t = useTheme();
  const shadow: ViewStyle = flat
    ? {}
    : {
        shadowColor: t.dark ? '#000' : '#15131F',
        shadowOpacity: t.glassShadow,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 10 },
        elevation: 3,
      };
  // O fundo de vidro é uma camada absoluta: assim o cartão tem sempre a altura
  // do conteúdo (ou a que o pai lhe der), sem crescer para encher o ecrã.
  const inner = (
    <>
      <GlassSurface radius={radius} tone={tone} />
      <View style={[{ borderRadius: radius, overflow: 'hidden' }, contentStyle]}>{children}</View>
    </>
  );
  if (onPress) {
    return (
      <PressableScale onPress={onPress} accessibilityLabel={accessibilityLabel} style={[{ borderRadius: radius }, shadow, style]}>
        {inner}
      </PressableScale>
    );
  }
  return (
    <View accessibilityLabel={accessibilityLabel} style={[{ borderRadius: radius }, shadow, style]}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { overflow: 'hidden', borderWidth: 1 },
});
