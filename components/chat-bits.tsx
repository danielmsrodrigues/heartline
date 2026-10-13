import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { Tone, useTheme } from '@/constants/theme';

function Dot({ delay }: { delay: number }) {
  const t = useTheme();
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 280, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: 420 })
        ),
        -1
      )
    );
  }, [delay, lift]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -5 * lift.value }], opacity: 0.45 + 0.55 * lift.value }));
  return <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.ink }, style]} />;
}

/** Três pontinhos a saltar: a resposta está a ser escrita. */
export function TypingDots() {
  return (
    <View accessible accessibilityLabel="A escrever" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 22 }}>
      <Dot delay={0} />
      <Dot delay={150} />
      <Dot delay={300} />
    </View>
  );
}

type Block = { kind: 'text'; text: string } | { kind: 'bullet'; text: string };

/** Separa uma resposta em frases e pontos ("- ", "• ", "* " ou "1. " no início da linha). */
function parse(answer: string): Block[] {
  return answer
    .replace(/\*\*/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const bullet = /^(?:[-•*]|\d+[.)])\s+(.*)$/.exec(line);
      return bullet ? { kind: 'bullet', text: bullet[1] } : { kind: 'text', text: line };
    });
}

/** Resposta do assistente: frase de abertura e pontos curtos, fáceis de ler de relance. */
export function AnswerText({ answer, tone }: { answer: string; tone: Tone }) {
  const t = useTheme();
  const blocks = parse(answer);
  return (
    <View style={{ gap: 8 }}>
      {blocks.map((block, i) =>
        block.kind === 'bullet' ? (
          <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, marginTop: 8, backgroundColor: t.dot[tone === 'none' ? 'none' : tone] }} />
            <Text style={{ flex: 1, fontSize: 16, lineHeight: 23, color: t.ink }}>{block.text}</Text>
          </View>
        ) : (
          <Text key={i} style={{ fontSize: 16, lineHeight: 23, fontWeight: i === 0 && blocks.length > 1 ? '600' : '400', color: t.ink }}>{block.text}</Text>
        )
      )}
    </View>
  );
}
