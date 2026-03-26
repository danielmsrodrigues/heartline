import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  TouchableOpacity,
  ViewToken,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const ORB_GREY = require('@/assets/images/orb-empty.png');
const ORB_GREEN = require('@/assets/images/orb-good.png');

// --- Subtle glow (simplified, no lava blobs) ---
function SimpleGlow({ color, size, opacity = 0.25 }: { color: string; size: number; opacity?: number }) {
  return (
    <View style={{ position: 'absolute', width: size, height: size, left: '50%', top: '50%', marginLeft: -size / 2, marginTop: -size / 2 }}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="sg" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={String(opacity)} />
            <Stop offset="50%" stopColor={color} stopOpacity={String(opacity * 0.4)} />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx={size / 2} cy={size / 2} rx={size / 2} ry={size / 2} fill="url(#sg)" />
      </Svg>
    </View>
  );
}

// --- Particles (simplified, fewer) ---
function WelcomeParticle({ color, containerSize, delay }: { color: string; containerSize: number; delay: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const angle = useRef(Math.random() * Math.PI * 2).current;
  const dist = useRef(35 + Math.random() * 55).current;
  const x = Math.cos(angle) * dist;
  const y = Math.sin(angle) * dist;
  const size = 1.5 + Math.random() * 1.5;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.4 + Math.random() * 0.3, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.delay(800 + Math.random() * 1200),
          Animated.timing(opacity, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.delay(400 + Math.random() * 600),
        ])
      ).start();
    }, delay);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: containerSize / 2 + x - size / 2,
        top: containerSize / 2 + y - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
      }}
    />
  );
}

// --- Floating mini card with idle drift ---
function FloatingMiniCard({ appearAnim, w1, w2, driftDuration, driftY }: {
  appearAnim: Animated.Value; w1: number; w2: number; driftDuration: number; driftY: number;
}) {
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: driftDuration / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: driftDuration / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const translateY = Animated.add(
    appearAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
    float.interpolate({ inputRange: [0, 1], outputRange: [0, driftY] }),
  );

  return (
    <Animated.View
      style={{
        opacity: appearAnim,
        transform: [{ translateY }],
        backgroundColor: '#111111',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        gap: 6,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <View style={{ width: w1, height: 8, borderRadius: 4, backgroundColor: '#333333' }} />
      <View style={{ width: w2, height: 8, borderRadius: 4, backgroundColor: '#222222' }} />
    </Animated.View>
  );
}

// --- Slide 1: Grey orb pulse + staggered floating mini cards ---
function Slide1({ active }: { active: boolean }) {
  const card1 = useRef(new Animated.Value(0)).current;
  const card2 = useRef(new Animated.Value(0)).current;
  const card3 = useRef(new Animated.Value(0)).current;
  const orbPulse = useRef(new Animated.Value(1)).current;
  const hasPlayed = useRef(false);

  useEffect(() => {
    // Orb subtle pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbPulse, { toValue: 1.04, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(orbPulse, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (active && !hasPlayed.current) {
      hasPlayed.current = true;
      const easeOut = Easing.out(Easing.ease);
      Animated.stagger(200, [
        Animated.timing(card1, { toValue: 1, duration: 400, easing: easeOut, useNativeDriver: true }),
        Animated.timing(card2, { toValue: 1, duration: 400, easing: easeOut, useNativeDriver: true }),
        Animated.timing(card3, { toValue: 1, duration: 400, easing: easeOut, useNativeDriver: true }),
      ]).start();
    }
  }, [active]);

  return (
    <View style={{ alignItems: 'center' }}>
      {/* Orb */}
      <View style={{ width: 180, height: 180, alignItems: 'center', justifyContent: 'center' }}>
        <SimpleGlow color="#888888" size={160} opacity={0.12} />
        <Animated.View style={{ width: 100, height: 100, borderRadius: 50, overflow: 'hidden', transform: [{ scale: orbPulse }] }}>
          <Image source={ORB_GREY} style={{ width: 100, height: 100 }} resizeMode="cover" />
        </Animated.View>
      </View>
      {/* Floating mini cards */}
      <View style={{ width: 200, gap: 8, marginTop: 8 }}>
        <FloatingMiniCard appearAnim={card1} w1={120} w2={80} driftDuration={3000} driftY={-3} />
        <FloatingMiniCard appearAnim={card2} w1={100} w2={70} driftDuration={3600} driftY={3} />
        <FloatingMiniCard appearAnim={card3} w1={140} w2={60} driftDuration={4200} driftY={-2.5} />
      </View>
    </View>
  );
}

// --- Slide 2: Grey → Green crossfade, then pulse + glow breathe ---
function Slide2({ active }: { active: boolean }) {
  const greenOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const orbPulse = useRef(new Animated.Value(1)).current;
  const glowBreath = useRef(new Animated.Value(0.3)).current;
  const hasPlayed = useRef(false);

  useEffect(() => {
    // Continuous pulse (runs always, only visible once green)
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbPulse, { toValue: 1.04, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(orbPulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
    // Glow breathing (runs always, modulated by glowOpacity)
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowBreath, { toValue: 0.5, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowBreath, { toValue: 0.2, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (active && !hasPlayed.current) {
      hasPlayed.current = true;
      Animated.sequence([
        Animated.delay(400),
        Animated.parallel([
          Animated.timing(greenOpacity, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ]).start();
    }
  }, [active]);

  // Multiply glow visibility by breath intensity
  const combinedGlow = Animated.multiply(glowOpacity, glowBreath);

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: 220, height: 220, alignItems: 'center', justifyContent: 'center' }}>
        {/* Glow appears and breathes */}
        <Animated.View style={{ position: 'absolute', opacity: combinedGlow, transform: [{ scale: orbPulse }] }}>
          <SimpleGlow color="#1D9E75" size={220} opacity={1} />
        </Animated.View>
        {/* Orb with pulse */}
        <Animated.View style={{ width: 120, height: 120, borderRadius: 60, overflow: 'hidden', transform: [{ scale: orbPulse }] }}>
          <Image source={ORB_GREY} style={{ width: 120, height: 120 }} resizeMode="cover" />
          {/* Green orb crossfading on top */}
          <Animated.View style={{ position: 'absolute', top: 0, left: 0, opacity: greenOpacity }}>
            <Image source={ORB_GREEN} style={{ width: 120, height: 120 }} resizeMode="cover" />
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

// --- Rotating questions ---
const SAMPLE_QUESTIONS = [
  'O meu LDL tem vindo a subir — faz sentido acompanhar mais de perto?',
  'Com historial familiar, vale a pena fazer análises com mais frequência?',
  'O meu HDL está baixo — o exercício que faço é suficiente?',
  'Os meus triglicéridos estão no limite — que mudanças fariam diferença?',
];

// --- Slide 3: Active green orb + particles + rotating questions ---
function Slide3({ active }: { active: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const questionAnim = useRef(new Animated.Value(1)).current;
  const [questionIdx, setQuestionIdx] = useState(0);
  const hasPlayed = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    // Pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.03, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
    return () => { alive.current = false; };
  }, []);

  useEffect(() => {
    if (active && !hasPlayed.current) {
      hasPlayed.current = true;
      Animated.timing(cardOpacity, { toValue: 1, duration: 500, delay: 600, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
    }
  }, [active]);

  // Rotate questions
  useEffect(() => {
    if (!active) return;
    const easeIO = Easing.inOut(Easing.ease);
    const cycle = () => {
      if (!alive.current) return;
      setTimeout(() => {
        if (!alive.current) return;
        // Fade out
        Animated.timing(questionAnim, { toValue: 0, duration: 300, easing: easeIO, useNativeDriver: true }).start(() => {
          if (!alive.current) return;
          setQuestionIdx(prev => (prev + 1) % SAMPLE_QUESTIONS.length);
          // Fade in
          Animated.timing(questionAnim, { toValue: 1, duration: 300, easing: easeIO, useNativeDriver: true }).start(() => cycle());
        });
      }, 3000);
    };
    cycle();
  }, [active]);

  const containerSize = 220;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: containerSize, height: containerSize, alignItems: 'center', justifyContent: 'center' }}>
        <SimpleGlow color="#1D9E75" size={220} opacity={0.35} />
        {/* Particles */}
        {Array.from({ length: 10 }, (_, i) => (
          <WelcomeParticle key={i} color="#5DFFC2" containerSize={containerSize} delay={i * 300} />
        ))}
        {/* Orb */}
        <Animated.View style={{ width: 120, height: 120, borderRadius: 60, overflow: 'hidden', transform: [{ scale }] }}>
          <Image source={ORB_GREEN} style={{ width: 120, height: 120 }} resizeMode="cover" />
        </Animated.View>
      </View>
      {/* Rotating question card */}
      <Animated.View
        style={{
          opacity: cardOpacity,
          marginTop: 8,
          width: 240,
          backgroundColor: '#111111',
          borderRadius: 12,
          padding: 14,
          borderWidth: 0.5,
          borderColor: 'rgba(29,158,117,0.15)',
          minHeight: 72,
        }}
      >
        <Text style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: '#555555', marginBottom: 6 }}>
          Para o teu médico
        </Text>
        <Animated.View style={{ opacity: questionAnim, transform: [{ translateY: questionAnim.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }] }}>
          <Text style={{ fontSize: 13, lineHeight: 19, color: '#D4D4D4', fontStyle: 'italic' }}>
            "{SAMPLE_QUESTIONS[questionIdx]}"
          </Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// --- Slide data ---
const slides = [
  {
    id: '1',
    title: 'Os teus exames, organizados',
    description:
      'Fotografa ou importa os teus exames clínicos. O Heartline extrai os valores automaticamente e organiza tudo num só lugar.',
  },
  {
    id: '2',
    title: 'Contexto, não números soltos',
    description:
      'A medicina analisa exames isoladamente. O Heartline cruza os teus dados ao longo do tempo, com o teu histórico familiar e estilo de vida.',
  },
  {
    id: '3',
    title: 'Melhores conversas com o teu médico',
    description:
      'Recebe perguntas personalizadas para a tua próxima consulta, baseadas nos teus dados concretos. Informação clara, ação concreta.',
  },
];

function AnimatedDot({ index, scrollX }: { index: number; scrollX: Animated.Value }) {
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const dotWidth = scrollX.interpolate({
    inputRange,
    outputRange: [8, 24, 8],
    extrapolate: 'clamp',
  });

  const dotOpacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.3, 1, 0.3],
    extrapolate: 'clamp',
  });

  const dotColor = scrollX.interpolate({
    inputRange,
    outputRange: ['#333333', '#1D9E75', '#333333'],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={{
        width: dotWidth,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
        backgroundColor: dotColor,
        opacity: dotOpacity,
      }}
    />
  );
}

export default function WelcomeScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        const newIndex = viewableItems[0].index;
        if (newIndex !== currentIndex) {
          Haptics.selectionAsync();
        }
        setCurrentIndex(newIndex);
      }
    },
    [currentIndex]
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    Haptics.selectionAsync();
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      handleGetStarted();
    }
  };

  const handleGetStarted = async () => {
    await AsyncStorage.setItem('has_seen_welcome', 'true');
    router.replace('/(auth)/register');
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('has_seen_welcome', 'true');
    router.replace('/(auth)/register');
  };

  const isLast = currentIndex === slides.length - 1;

  return (
    <SafeAreaView className="flex-1 bg-[#0A0A0A]">
      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity
          onPress={handleSkip}
          className="absolute top-16 right-6 z-10"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text className="text-sm text-[#555555]">Saltar</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => (
          <View style={{ width }} className="flex-1 items-center justify-center px-10">
            {/* Visual */}
            <View style={{ marginBottom: 32 }}>
              {index === 0 ? <Slide1 active={currentIndex === 0} /> : null}
              {index === 1 ? <Slide2 active={currentIndex === 1} /> : null}
              {index === 2 ? <Slide3 active={currentIndex === 2} /> : null}
            </View>
            {/* Copy */}
            <Text className="text-2xl font-bold text-[#F5F5F5] text-center mb-4">
              {item.title}
            </Text>
            <Text className="text-base text-[#888888] text-center leading-6">
              {item.description}
            </Text>
          </View>
        )}
      />

      {/* Bottom section */}
      <View className="px-6 pb-4">
        {/* Dots */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 32 }}>
          {slides.map((_, i) => (
            <AnimatedDot key={i} index={i} scrollX={scrollX} />
          ))}
        </View>

        {/* Button */}
        <TouchableOpacity
          onPress={handleNext}
          className="bg-[#1D9E75] rounded-xl py-4 items-center"
          activeOpacity={0.8}
        >
          <Text className="text-white font-semibold text-base">
            {isLast ? 'Começar' : 'Seguinte'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
