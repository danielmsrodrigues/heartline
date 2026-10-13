import { Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { ZoomIn } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import { ON_VIVID, useTheme } from '@/constants/theme';
import { useFloat } from '@/hooks/useFloat';
import { Lockup } from '@/components/logo';
import { Sparkline } from '@/components/sparkline';
import { Button } from '@/components/ui/Button';
import { riseIn } from '@/components/ui/enter';
import { Glass } from '@/components/ui/Glass';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { DISCLAIMER, Note, Sub, Title } from '@/components/ui/Text';

/** Folha de exame: linhas de nomes e valores, com um deles em destaque. */
function ExamSheet() {
  const t = useTheme();
  const rows = [64, 88, 112, 136, 160];
  return (
    <Svg width={150} height={196} viewBox="0 0 150 196" fill="none">
      <Rect x={1} y={1} width={148} height={194} rx={16} fill={t.paper} stroke={t.hairline} strokeWidth={1.5} />
      <Path d="M20 34 H90" stroke={t.ink} strokeWidth={6} strokeLinecap="round" opacity={0.8} />
      {rows.map((y) => (
        <Path key={`name${y}`} d={`M20 ${y} H78`} stroke={t.sub} strokeWidth={5} strokeLinecap="round" opacity={0.4} />
      ))}
      {rows.map((y) => (
        // O valor da terceira linha é o que a app vai destacar.
        <Path key={`value${y}`} d={`M104 ${y} H130`} stroke={y === 112 ? t.dot.att : t.sub} strokeWidth={5} strokeLinecap="round" opacity={y === 112 ? 1 : 0.4} />
      ))}
    </Svg>
  );
}

// A imagem mostra o que a app faz: a folha do exame passa a um valor explicado
// e a perguntas para levar ao médico.
function Hero() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const sheetFloat = useFloat(0, 6);
  const cardFloat = useFloat(500, 8);
  const pillFloat = useFloat(900, 5);
  const frame = Math.min(width - 48, 380);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="A folha do exame transforma-se num valor explicado e em perguntas para o médico"
      style={{ width: frame, height: 340, alignSelf: 'center' }}
    >
      <Animated.View entering={riseIn()} style={{ position: 'absolute', left: 10, top: 30 }}>
        <Animated.View style={[{ transform: [{ rotate: '-8deg' }], shadowColor: '#15131F', shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 12 } }, sheetFloat]}>
          <ExamSheet />
        </Animated.View>
      </Animated.View>

      <Animated.View entering={riseIn(260)} style={{ position: 'absolute', right: 2, top: 92, width: 168 }}>
        <Animated.View style={[{ transform: [{ rotate: '4deg' }] }, cardFloat]}>
          <Glass radius={28} contentStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14 }}>
            <Text style={{ fontSize: 15, lineHeight: 20, fontWeight: '500', color: t.sub }}>Colesterol "mau"</Text>
            <Text style={{ marginTop: 4, fontSize: 40, lineHeight: 44, fontWeight: '500', letterSpacing: -0.8, color: t.ink }}>
              142<Text style={{ fontSize: 15, fontWeight: '400', letterSpacing: 0, color: t.sub }}> mg/dL</Text>
            </Text>
            <View style={{ marginTop: 10 }}>
              <Sparkline data={[118, 121, 129, 136, 142]} color={t.dot.att} width={132} height={40} />
            </View>
            <Text style={{ marginTop: 6, fontSize: 13, lineHeight: 18, fontWeight: '600', color: t.level.att }}>A subir</Text>
          </Glass>
        </Animated.View>
      </Animated.View>

      <Animated.View entering={ZoomIn.delay(520).duration(320)} style={{ position: 'absolute', left: 146, top: 136, width: 44, height: 44, borderRadius: 22, backgroundColor: t.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="arrow" size={18} color={t.primaryFg} weight="bold" />
      </Animated.View>

      <Animated.View entering={riseIn(700)} style={{ position: 'absolute', left: 30, top: 266 }}>
        <Animated.View style={[{ transform: [{ rotate: '-3deg' }] }, pillFloat]}>
          <Glass tone="att" radius={28} contentStyle={{ height: 54, paddingLeft: 10, paddingRight: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.pill, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="chat" size={18} color={t.pillFg} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '600', color: ON_VIVID }}>3 perguntas para o médico</Text>
          </Glass>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();

  const leave = async (target: '/(auth)/register' | '/(auth)/login') => {
    await AsyncStorage.setItem('has_seen_welcome', 'true');
    router.replace(target);
  };

  return (
    <Screen tone="att" scroll={false} top={6} contentStyle={{ paddingBottom: 16 }}>
      <Lockup size={30} />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Hero />
        <Title large style={{ marginTop: 18, fontSize: 36, lineHeight: 42 }}>Percebe as tuas análises</Title>
        <Sub style={{ marginTop: 8, fontSize: 17, lineHeight: 25 }}>Fotografa o exame. Eu explico o resto.</Sub>
      </View>
      <Button title="Criar conta" onPress={() => leave('/(auth)/register')} />
      <Button variant="text" title="Já tenho conta" onPress={() => leave('/(auth)/login')} style={{ marginTop: 6 }} />
      <Note style={{ marginTop: 6 }}>{DISCLAIMER}</Note>
    </Screen>
  );
}
