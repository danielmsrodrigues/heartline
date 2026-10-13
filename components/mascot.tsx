import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, PanResponder, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { MASCOT_COLORS, MASCOT_EYES, Tone } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

const BLOB = 'M52 5 C78 4 96 24 94 50 C92 78 74 96 48 94 C22 92 5 74 7 48 C9 22 28 6 52 5 Z';
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(items: T[], except?: T): T => {
  const pool = except === undefined ? items : items.filter((i) => i !== except);
  return pool[Math.floor(Math.random() * pool.length)];
};

type Reaction = 'jump' | 'doubleJump' | 'wobble' | 'wink' | 'spin' | 'squish' | 'shake' | 'nod' | 'inflate' | 'peek';
const REACTIONS: Reaction[] = ['jump', 'doubleJump', 'wobble', 'wink', 'spin', 'squish', 'shake', 'nod', 'inflate', 'peek'];

type Idle = 'hop' | 'stretch' | 'tilt' | 'lookUp' | 'sleepy' | 'shimmy';
const IDLES: Idle[] = ['hop', 'stretch', 'tilt', 'lookUp', 'sleepy', 'shimmy'];

interface MascotProps {
  size: number;
  tone?: Tone;
  /** Olhos em arco (estado "dentro do esperado"). */
  happy?: boolean;
  /** Olhar para baixo, como quem lê. */
  reading?: boolean;
  /** false pára as animações (ecrã fora de foco). */
  active?: boolean;
  /** Reage ao toque e deixa-se arrastar (volta ao sítio com uma mola). */
  interactive?: boolean;
  /** Deambula devagar à volta do sítio, em vez de ficar parado. */
  wander?: boolean;
  onPress?: () => void;
  /** Avisa quando começa e acaba de ser arrastado (para o ecrã parar o scroll). */
  onDragChange?: (dragging: boolean) => void;
  accessibilityLabel?: string;
}

/**
 * O boneco do Heartline. Respira, pisca, olha à volta e de vez em quando faz
 * alguma coisa por conta própria. Ao toque reage de forma diferente de cada vez,
 * e pode ser arrastado pelo ecrã. A cor segue o tom (estado).
 */
export function Mascot({ size, tone = 'none', happy = false, reading = false, active = true, interactive = false, wander = false, onPress, onDragChange, accessibilityLabel }: MascotProps) {
  const breath = useSharedValue(0);
  const sway = useSharedValue(0);
  const blinkL = useSharedValue(0);
  const blinkR = useSharedValue(0);
  const lookX = useSharedValue(0);
  const lookY = useSharedValue(0);
  const lift = useSharedValue(0);
  const squash = useSharedValue(0);
  const tilt = useSharedValue(0);
  const turn = useSharedValue(0);
  const shiftX = useSharedValue(0);
  const puff = useSharedValue(0);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const roamX = useSharedValue(0);
  const roamY = useSharedValue(0);
  const held = useSharedValue(0);

  // Mudança de cor: a cor anterior fica por cima e desvanece.
  const [prevTone, setPrevTone] = useState(tone);
  const lastTone = useRef(tone);
  const fade = useSharedValue(0);
  useEffect(() => {
    if (lastTone.current === tone) return;
    setPrevTone(lastTone.current);
    lastTone.current = tone;
    fade.value = 1;
    fade.value = withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) });
  }, [tone, fade]);

  const [smiling, setSmiling] = useState(false);
  const smileTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const smile = useCallback((ms: number) => {
    setSmiling(true);
    if (smileTimer.current) clearTimeout(smileTimer.current);
    smileTimer.current = setTimeout(() => setSmiling(false), ms);
  }, []);
  useEffect(() => () => { if (smileTimer.current) clearTimeout(smileTimer.current); }, []);

  const close = useCallback((ms = 120) => withSequence(withTiming(1, { duration: 70 }), withDelay(ms, withTiming(0, { duration: 120 }))), []);
  const land = useCallback(() => {
    // Achata ao aterrar e volta com mola.
    squash.value = withSequence(withTiming(1, { duration: 90 }), withSpring(0, { damping: 7, stiffness: 180 }));
  }, [squash]);

  const hop = useCallback((height: number, up = 200) => {
    lift.value = withSequence(
      withTiming(height, { duration: up, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: up + 20, easing: Easing.in(Easing.quad) })
    );
    squash.value = withSequence(withTiming(-0.5, { duration: up - 20 }), withDelay(up + 30, withTiming(1, { duration: 90 })), withSpring(0, { damping: 7, stiffness: 180 }));
  }, [lift, squash]);

  // ---- vida própria: respirar, piscar, olhar, e pequenos gestos ao acaso
  useEffect(() => {
    if (!active) return;
    breath.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true);
    sway.value = withRepeat(withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }), -1, true);

    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => { timers.push(setTimeout(() => { if (alive) fn(); }, ms)); };

    const blink = () => {
      const twice = Math.random() < 0.25;
      blinkL.value = twice ? withSequence(close(0), withDelay(90, close(0))) : close(0);
      blinkR.value = twice ? withSequence(close(0), withDelay(90, close(0))) : close(0);
      later(blink, rand(2400, 5600));
    };
    const glance = () => {
      const x = rand(-5, 5);
      const y = rand(-2.5, 2.5);
      const hold = rand(500, 1400);
      lookX.value = withSequence(withTiming(x, { duration: 260 }), withDelay(hold, withTiming(0, { duration: 320 })));
      lookY.value = withSequence(withTiming(y, { duration: 260 }), withDelay(hold, withTiming(0, { duration: 320 })));
      later(glance, rand(3600, 8000));
    };
    let lastIdle: Idle | undefined;
    const fidget = () => {
      // Não interromper enquanto está a ser arrastado.
      if (held.value === 0) {
        const idle = pick(IDLES, lastIdle);
        lastIdle = idle;
        if (idle === 'hop') hop(0.35, 150);
        else if (idle === 'stretch') squash.value = withSequence(withTiming(-0.9, { duration: 420 }), withDelay(260, withSpring(0, { damping: 8, stiffness: 120 })));
        else if (idle === 'tilt') tilt.value = withSequence(withTiming(pick([-0.7, 0.7]), { duration: 320 }), withDelay(900, withSpring(0, { damping: 10, stiffness: 120 })));
        else if (idle === 'lookUp') lookY.value = withSequence(withTiming(-4, { duration: 300 }), withDelay(1100, withTiming(0, { duration: 360 })));
        else if (idle === 'sleepy') {
          blinkL.value = withSequence(withTiming(0.7, { duration: 500 }), withDelay(700, withTiming(0, { duration: 260 })));
          blinkR.value = withSequence(withTiming(0.7, { duration: 500 }), withDelay(700, withTiming(0, { duration: 260 })));
          squash.value = withSequence(withTiming(0.5, { duration: 600 }), withDelay(600, withSpring(0, { damping: 9, stiffness: 100 })));
        } else {
          shiftX.value = withSequence(withTiming(-0.5, { duration: 140 }), withTiming(0.5, { duration: 200 }), withSpring(0, { damping: 9, stiffness: 160 }));
        }
      }
      later(fidget, rand(5500, 11000));
    };
    const roam = () => {
      const duration = rand(2600, 4600);
      roamX.value = withTiming(rand(-1, 1), { duration, easing: Easing.inOut(Easing.sin) });
      roamY.value = withTiming(rand(-1, 1), { duration, easing: Easing.inOut(Easing.sin) });
      later(roam, duration + rand(200, 1400));
    };

    later(blink, rand(900, 2400));
    later(glance, rand(2200, 4200));
    later(fidget, rand(3800, 7000));
    if (wander) later(roam, 600);

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      cancelAnimation(breath);
      cancelAnimation(sway);
    };
  }, [active, wander, breath, sway, blinkL, blinkR, lookX, lookY, squash, tilt, shiftX, roamX, roamY, held, close, hop]);

  // ---- reações ao toque: uma ao acaso, nunca a mesma duas vezes seguidas
  const lastReaction = useRef<Reaction | undefined>(undefined);
  const react = useCallback(() => {
    haptics.press();
    const reaction = pick(REACTIONS, lastReaction.current);
    lastReaction.current = reaction;
    const side = pick([-1, 1]);
    switch (reaction) {
      case 'jump':
        hop(1);
        smile(1000);
        break;
      case 'doubleJump':
        lift.value = withSequence(
          withTiming(0.7, { duration: 170, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 170, easing: Easing.in(Easing.quad) }),
          withTiming(1.1, { duration: 210, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) })
        );
        squash.value = withSequence(withDelay(330, withTiming(0.8, { duration: 70 })), withTiming(-0.4, { duration: 160 }), withDelay(290, withTiming(1, { duration: 90 })), withSpring(0, { damping: 7, stiffness: 180 }));
        smile(1300);
        break;
      case 'wobble':
        tilt.value = withSequence(withTiming(side, { duration: 90 }), withTiming(-side, { duration: 160 }), withTiming(side * 0.6, { duration: 140 }), withTiming(-side * 0.4, { duration: 130 }), withSpring(0, { damping: 9, stiffness: 160 }));
        break;
      case 'wink':
        (side > 0 ? blinkR : blinkL).value = withSequence(withTiming(1, { duration: 80 }), withDelay(420, withTiming(0, { duration: 140 })));
        tilt.value = withSequence(withTiming(side * 0.5, { duration: 140 }), withDelay(360, withSpring(0, { damping: 10, stiffness: 160 })));
        break;
      case 'spin':
        turn.value = 0;
        turn.value = withSequence(withTiming(side, { duration: 620, easing: Easing.inOut(Easing.cubic) }), withTiming(0, { duration: 0 }));
        lift.value = withSequence(withTiming(0.45, { duration: 300, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 320, easing: Easing.in(Easing.quad) }));
        setTimeout(land, 600);
        smile(1100);
        break;
      case 'squish':
        squash.value = withSequence(withTiming(1.8, { duration: 130 }), withDelay(120, withSpring(0, { damping: 5, stiffness: 170 })));
        blinkL.value = close(260);
        blinkR.value = close(260);
        break;
      case 'shake':
        shiftX.value = withSequence(withTiming(-1, { duration: 70 }), withTiming(1, { duration: 110 }), withTiming(-0.8, { duration: 100 }), withTiming(0.6, { duration: 90 }), withSpring(0, { damping: 9, stiffness: 200 }));
        lookX.value = withSequence(withTiming(-4, { duration: 70 }), withTiming(4, { duration: 110 }), withTiming(-3, { duration: 100 }), withTiming(0, { duration: 160 }));
        break;
      case 'nod':
        lookY.value = withSequence(withTiming(4, { duration: 130 }), withTiming(-2, { duration: 150 }), withTiming(4, { duration: 140 }), withTiming(0, { duration: 180 }));
        squash.value = withSequence(withTiming(0.6, { duration: 130 }), withTiming(-0.2, { duration: 150 }), withTiming(0.6, { duration: 140 }), withSpring(0, { damping: 9, stiffness: 160 }));
        smile(900);
        break;
      case 'inflate':
        puff.value = withSequence(withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) }), withDelay(160, withSpring(0, { damping: 5, stiffness: 150 })));
        blinkL.value = withSequence(withTiming(-0.25, { duration: 300 }), withDelay(180, withTiming(0, { duration: 160 })));
        blinkR.value = withSequence(withTiming(-0.25, { duration: 300 }), withDelay(180, withTiming(0, { duration: 160 })));
        break;
      case 'peek':
        shiftX.value = withSequence(withTiming(side * 0.9, { duration: 220 }), withDelay(520, withSpring(0, { damping: 9, stiffness: 140 })));
        tilt.value = withSequence(withTiming(side * 0.8, { duration: 220 }), withDelay(520, withSpring(0, { damping: 9, stiffness: 140 })));
        lookX.value = withSequence(withTiming(side * 5, { duration: 220 }), withDelay(520, withTiming(0, { duration: 260 })));
        break;
    }
    onPress?.();
  }, [hop, land, smile, close, lift, squash, tilt, turn, shiftX, puff, lookX, lookY, blinkL, blinkR, onPress]);

  // ---- arrastar: segue o dedo (sem sair do ecrã), olha para onde vai, e volta ao sítio com uma mola
  const handle = useRef<View>(null);
  // Até onde pode ir a partir do sítio onde está, para cada lado.
  const bounds = useRef({ minX: -80, maxX: 80, minY: -80, maxY: 80 });
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          const window = Dimensions.get('window');
          handle.current?.measureInWindow((x, y, width, height) => {
            bounds.current = {
              minX: 8 - x,
              maxX: window.width - 8 - (x + width),
              // Em cima fica abaixo da barra de estado; em baixo, acima do menu.
              minY: 54 - y,
              maxY: window.height - 104 - (y + height),
            };
          });
          held.value = 1;
          onDragChange?.(true);
          squash.value = withTiming(0.5, { duration: 120 });
        },
        onPanResponderMove: (_, g) => {
          const limit = bounds.current;
          dragX.value = Math.max(limit.minX, Math.min(limit.maxX, g.dx));
          dragY.value = Math.max(limit.minY, Math.min(limit.maxY, g.dy));
          lookX.value = Math.max(-5, Math.min(5, g.vx * 4));
          lookY.value = Math.max(-3, Math.min(3, g.vy * 3));
          tilt.value = Math.max(-1, Math.min(1, g.vx * 0.6));
        },
        onPanResponderRelease: (_, g) => {
          held.value = 0;
          onDragChange?.(false);
          const moved = Math.abs(g.dx) + Math.abs(g.dy);
          dragX.value = withSpring(0, { damping: 9, stiffness: 110, velocity: g.vx * 300 });
          dragY.value = withSpring(0, { damping: 9, stiffness: 110, velocity: g.vy * 300 });
          lookX.value = withTiming(0, { duration: 300 });
          lookY.value = withTiming(0, { duration: 300 });
          tilt.value = withSpring(0, { damping: 6, stiffness: 120 });
          squash.value = withSpring(0, { damping: 6, stiffness: 160 });
          // Sem deslocação é um toque.
          if (moved < 8) react();
        },
        onPanResponderTerminate: () => {
          held.value = 0;
          onDragChange?.(false);
          dragX.value = withSpring(0);
          dragY.value = withSpring(0);
          squash.value = withSpring(0);
        },
      }),
    [react, onDragChange, held, squash, dragX, dragY, lookX, lookY, tilt]
  );

  const place = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragX.value + roamX.value * size * 0.05 + shiftX.value * size * 0.09 },
      { translateY: dragY.value + roamY.value * size * 0.04 },
    ],
  }));

  const body = useAnimatedStyle(() => {
    const b = breath.value;
    const s = squash.value;
    const p = puff.value;
    return {
      transform: [
        { translateY: -b * size * 0.012 - lift.value * size * 0.14 + Math.max(0, s) * size * 0.03 },
        { rotate: `${(sway.value - 0.5) * 3 + tilt.value * 9 + turn.value * 360}deg` },
        { scaleX: 1 - b * 0.012 + s * 0.07 + p * 0.14 },
        { scaleY: 1 + b * 0.028 - s * 0.08 + p * 0.14 },
      ],
    };
  });

  const eyeY = reading ? 51 : happy ? 46 : 44;
  const leftEye = useAnimatedProps(() => ({
    cx: 40 + lookX.value,
    cy: eyeY + lookY.value,
    ry: 5.5 * (1 - 0.9 * blinkL.value),
  }));
  const rightEye = useAnimatedProps(() => ({
    cx: 62 + lookX.value,
    cy: eyeY + lookY.value,
    ry: 5.5 * (1 - 0.9 * blinkR.value),
  }));
  const fading = useAnimatedProps(() => ({ opacity: fade.value }));

  const eye = MASCOT_EYES[tone];
  const arcs = happy || smiling;
  const svg = (
    <Animated.View style={[{ width: size, height: size }, body]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d={BLOB} fill={MASCOT_COLORS[tone]} />
        <AnimatedPath d={BLOB} fill={MASCOT_COLORS[prevTone]} animatedProps={fading} />
        {arcs ? (
          <>
            <Path d="M33 49 q6 -8 12 0" fill="none" stroke={eye} strokeWidth={5} strokeLinecap="round" />
            <Path d="M55 49 q6 -8 12 0" fill="none" stroke={eye} strokeWidth={5} strokeLinecap="round" />
          </>
        ) : (
          <>
            <AnimatedEllipse rx={5.5} fill={eye} animatedProps={leftEye} />
            <AnimatedEllipse rx={5.5} fill={eye} animatedProps={rightEye} />
          </>
        )}
      </Svg>
    </Animated.View>
  );

  if (!interactive) {
    return (
      <Animated.View style={place} accessible={!!accessibilityLabel} accessibilityRole={accessibilityLabel ? 'image' : undefined} accessibilityLabel={accessibilityLabel}>
        {svg}
      </Animated.View>
    );
  }
  return (
    <Animated.View style={place}>
      <View
        ref={handle}
        {...pan.panHandlers}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? 'Boneco do Heartline'}
        accessibilityHint="Toca para ele reagir ou arrasta-o"
        onAccessibilityTap={react}
      >
        {svg}
      </View>
    </Animated.View>
  );
}
