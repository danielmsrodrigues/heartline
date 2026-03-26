import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Pressable,
  Image,
  Animated,
  Easing,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Plus, User, Info, ChevronRight, Sparkles, CheckCircle, Heart, MessageSquare, Camera, Eye, Quote, ArrowRight } from 'lucide-react-native';
import { useProfile } from '@/hooks/useProfile';
import { useBiomarkers } from '@/hooks/useBiomarkers';
import { useGeneratedContent } from '@/hooks/useGeneratedContent';
import { Sparkline } from '@/components/sparkline';
import { AttentionLevel } from '@/lib/types';
import { ATTENTION_COLORS } from '@/constants/colors';
import { SkeletonCard, SkeletonBiomarkerCard } from '@/components/ui/Skeleton';

const ORB_IMAGES = {
  good: require('@/assets/images/orb-good.png'),
  warning: require('@/assets/images/orb-warning.png'),
  danger: require('@/assets/images/orb-danger.png'),
  empty: require('@/assets/images/orb-empty.png'),
} as const;

type OrbStatus = 'good' | 'warning' | 'danger';

const BLOB_CONFIGS = [
  { w: 340, h: 250, ox: -25, oy: -20, sxDur: 3800, sxRange: [0.9, 1.15], syDur: 4200, syRange: [0.85, 1.1], rotDur: 7000, rotRange: [-12, 12] },
  { w: 270, h: 330, ox: 30, oy: 15, sxDur: 4500, sxRange: [0.88, 1.12], syDur: 3500, syRange: [0.9, 1.15], rotDur: 9000, rotRange: [8, -8] },
  { w: 320, h: 240, ox: -15, oy: 25, sxDur: 3200, sxRange: [0.92, 1.1], syDur: 5000, syRange: [0.88, 1.08], rotDur: 6000, rotRange: [-6, 15] },
  { w: 240, h: 320, ox: 20, oy: -25, sxDur: 5200, sxRange: [0.85, 1.08], syDur: 3800, syRange: [0.92, 1.12], rotDur: 8000, rotRange: [10, -10] },
  { w: 300, h: 280, ox: -30, oy: 8, sxDur: 4000, sxRange: [0.9, 1.1], syDur: 4600, syRange: [0.87, 1.1], rotDur: 10000, rotRange: [-8, 8] },
];

function LavaBlob({ color, config, id }: { color: string; config: typeof BLOB_CONFIGS[0]; id: string }) {
  const { w, h, ox, oy, sxDur, sxRange, syDur, syRange, rotDur, rotRange } = config;
  const sx = useRef(new Animated.Value(sxRange[0])).current;
  const sy = useRef(new Animated.Value(syRange[0])).current;
  const rot = useRef(new Animated.Value(rotRange[0])).current;
  const easeIO = Easing.inOut(Easing.ease);

  useEffect(() => {
    const lsx = Animated.loop(Animated.sequence([
      Animated.timing(sx, { toValue: sxRange[1], duration: sxDur / 2, easing: easeIO, useNativeDriver: true }),
      Animated.timing(sx, { toValue: sxRange[0], duration: sxDur / 2, easing: easeIO, useNativeDriver: true }),
    ]));
    const lsy = Animated.loop(Animated.sequence([
      Animated.timing(sy, { toValue: syRange[1], duration: syDur / 2, easing: easeIO, useNativeDriver: true }),
      Animated.timing(sy, { toValue: syRange[0], duration: syDur / 2, easing: easeIO, useNativeDriver: true }),
    ]));
    const lr = Animated.loop(Animated.sequence([
      Animated.timing(rot, { toValue: rotRange[1], duration: rotDur / 2, easing: easeIO, useNativeDriver: true }),
      Animated.timing(rot, { toValue: rotRange[0], duration: rotDur / 2, easing: easeIO, useNativeDriver: true }),
    ]));
    lsx.start(); lsy.start(); lr.start();
    return () => { lsx.stop(); lsy.stop(); lr.stop(); };
  }, []);

  const rotInterp = rot.interpolate({
    inputRange: [Math.min(rotRange[0], rotRange[1]), Math.max(rotRange[0], rotRange[1])],
    outputRange: [`${Math.min(rotRange[0], rotRange[1])}deg`, `${Math.max(rotRange[0], rotRange[1])}deg`],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: w,
        height: h,
        left: '50%',
        top: '50%',
        marginLeft: -w / 2 + ox,
        marginTop: -h / 2 + oy,
        opacity: 0.28,
        transform: [{ scaleX: sx }, { scaleY: sy }, { rotate: rotInterp }],
      }}
    >
      <Svg width={w} height={h}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={color} stopOpacity="1" />
            <Stop offset="30%" stopColor={color} stopOpacity="0.8" />
            <Stop offset="55%" stopColor={color} stopOpacity="0.3" />
            <Stop offset="80%" stopColor={color} stopOpacity="0.05" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

function OrbGlow({ color, size }: { color: string; size: number }) {
  return (
    <View style={{ position: 'absolute', width: size, height: size }}>
      {BLOB_CONFIGS.map((cfg, i) => (
        <LavaBlob key={i} color={color} config={cfg} id={`blob${i}`} />
      ))}
    </View>
  );
}

const NUM_PARTICLES = 18;

function randomPos() {
  const angle = Math.random() * Math.PI * 2;
  const dist = 45 + Math.random() * 95;
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
}

function Particle({ color, containerSize, delay }: {
  color: string; containerSize: number; delay: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const [pos, setPos] = useState(randomPos);
  const size = useRef(1.5 + Math.random() * 2).current;
  const alive = useRef(true);

  const cycle = useCallback(() => {
    if (!alive.current) return;
    const fadeDur = 1200 + Math.random() * 2000;
    const holdDur = 1500 + Math.random() * 2000;
    const driftX = (Math.random() - 0.5) * 30;
    const driftY = (Math.random() - 0.5) * 30;
    const easeIO = Easing.inOut(Easing.ease);

    tx.setValue(0);
    ty.setValue(0);

    Animated.parallel([
      // fade in → hold → fade out
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.2 + Math.random() * 0.4, duration: fadeDur, easing: easeIO, useNativeDriver: true }),
        Animated.delay(holdDur),
        Animated.timing(opacity, { toValue: 0, duration: fadeDur, easing: easeIO, useNativeDriver: true }),
      ]),
      // drift throughout entire lifecycle
      Animated.timing(tx, { toValue: driftX, duration: fadeDur * 2 + holdDur, easing: easeIO, useNativeDriver: true }),
      Animated.timing(ty, { toValue: driftY, duration: fadeDur * 2 + holdDur, easing: easeIO, useNativeDriver: true }),
    ]).start(() => {
      if (!alive.current) return;
      setPos(randomPos());
      setTimeout(() => cycle(), 200 + Math.random() * 600);
    });
  }, []);

  useEffect(() => {
    alive.current = true;
    const t = setTimeout(() => cycle(), delay);
    return () => { alive.current = false; clearTimeout(t); };
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: containerSize / 2 + pos.x - size / 2,
        top: containerSize / 2 + pos.y - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateX: tx }, { translateY: ty }],
      }}
    />
  );
}

function LuminousOrb({ status }: { status: OrbStatus }) {
  const scale = useRef(new Animated.Value(1)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.02,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    const spin = Animated.loop(
      Animated.sequence([
        Animated.timing(rotation, {
          toValue: 1,
          duration: 12000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rotation, {
          toValue: -1,
          duration: 12000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rotation, {
          toValue: 0,
          duration: 12000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    spin.start();
    return () => { pulse.stop(); spin.stop(); };
  }, []);

  const rotateInterp = rotation.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-8deg', '0deg', '8deg'],
  });

  const orbSize = 160;
  const glowSize = 360;
  const containerSize = 360;
  const glowColor = { good: '#1D9E75', warning: '#EF9F27', danger: '#E24B4A' }[status];
  const particleColor = { good: '#5DFFC2', warning: '#EF9F27', danger: '#F09595' }[status];

  return (
    <View style={{ width: containerSize, height: containerSize, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }}>
      {/* Organic glow aura */}
      <OrbGlow color={glowColor} size={glowSize} />
      {/* Magic dust particles */}
      {Array.from({ length: NUM_PARTICLES }, (_, i) => (
        <Particle key={i} color={particleColor} containerSize={containerSize} delay={i * 350} />
      ))}
      {/* Orb image — clean, no masks */}
      <Animated.View
        style={{
          width: orbSize,
          height: orbSize,
          borderRadius: orbSize / 2,
          overflow: 'hidden',
          transform: [{ scale }, { rotate: rotateInterp }],
        }}
      >
        <Image
          source={ORB_IMAGES[status]}
          style={{ width: orbSize, height: orbSize }}
          resizeMode="cover"
        />
      </Animated.View>
    </View>
  );
}


function PressableOrb({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(pressScale, {
        toValue: 0.92,
        useNativeDriver: true,
        speed: 50,
        bounciness: 0,
      }),
      Animated.timing(glowOpacity, {
        toValue: 0.6,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(pressScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 12,
        bounciness: 8,
      }),
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={{ transform: [{ scale: pressScale }], opacity: glowOpacity }}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const {
    profile,
    familyHistory,
    loading: profileLoading,
    refetch: refetchProfile,
  } = useProfile();
  const {
    biomarkers,
    loading: bioLoading,
    refetch: refetchBio,
  } = useBiomarkers(familyHistory.length > 0);
  const {
    cards,
    questions,
    loading: contentLoading,
    generating,
    refetch: refetchContent,
  } = useGeneratedContent();
  const [refreshing, setRefreshing] = useState(false);
  const headerBg = useRef(new Animated.Value(0)).current;

  // --- Entry animation (only on very first mount, not on re-focus/background) ---
  const isFirstEver = useRef(true);
  const orbAnim = useRef(new Animated.Value(1)).current;
  const orbScaleAnim = useRef(new Animated.Value(1)).current;
  const labelAnim = useRef(new Animated.Value(1)).current;
  const metricsAnim = useRef(new Animated.Value(1)).current;
  const cardsAnim = useRef(new Animated.Value(1)).current;
  const stepsAnim = useRef(new Animated.Value(1)).current;
  const quoteAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isFirstEver.current || bioLoading) return;
    isFirstEver.current = false;
    // Set to 0 and animate in
    orbAnim.setValue(0);
    orbScaleAnim.setValue(0.8);
    labelAnim.setValue(0);
    metricsAnim.setValue(0);
    cardsAnim.setValue(0);
    stepsAnim.setValue(0);
    quoteAnim.setValue(0);
    const easeOut = Easing.out(Easing.ease);
    Animated.parallel([
      Animated.timing(orbAnim, { toValue: 1, duration: 400, easing: easeOut, useNativeDriver: true }),
      Animated.timing(orbScaleAnim, { toValue: 1, duration: 400, easing: easeOut, useNativeDriver: true }),
    ]).start();
    Animated.timing(labelAnim, { toValue: 1, duration: 300, delay: 200, easing: easeOut, useNativeDriver: true }).start();
    Animated.timing(metricsAnim, { toValue: 1, duration: 300, delay: 400, easing: easeOut, useNativeDriver: true }).start();
    Animated.timing(cardsAnim, { toValue: 1, duration: 300, delay: 600, easing: easeOut, useNativeDriver: true }).start();
    Animated.timing(stepsAnim, { toValue: 1, duration: 300, delay: 500, easing: easeOut, useNativeDriver: true }).start();
    Animated.timing(quoteAnim, { toValue: 1, duration: 300, delay: 700, easing: easeOut, useNativeDriver: true }).start();
  }, [bioLoading]);

  // --- Silent auto-refresh on focus & app foreground ---
  useFocusEffect(
    useCallback(() => {
      refetchProfile();
      refetchBio();
      refetchContent();
    }, [refetchProfile, refetchBio, refetchContent])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refetchProfile();
        refetchBio();
        refetchContent();
      }
    });
    return () => sub.remove();
  }, [refetchProfile, refetchBio, refetchContent]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProfile(), refetchBio(), refetchContent()]);
    setRefreshing(false);
  }, [refetchProfile, refetchBio, refetchContent]);

  const hasData = biomarkers.length > 0;

  // Calculate overall status
  const outOfRange = biomarkers.filter(b => b.attentionLevel === 'fora_do_range').length;
  const needsAttention = biomarkers.filter(b => b.attentionLevel === 'merece_atencao' || b.attentionLevel === 'a_acompanhar').length;
  const expected = biomarkers.filter(b => b.attentionLevel === 'dentro_do_esperado').length;
  const toWatch = outOfRange + needsAttention;

  const overallStatus: OrbStatus =
    outOfRange > 0 ? 'danger' : needsAttention > 0 ? 'warning' : 'good';

  const statusLabel = {
    good: 'Sem alertas',
    warning: 'Merece atenção',
    danger: 'Fora do range',
  };

  const statusSubtitle = {
    good: 'Todos os valores dentro do esperado',
    warning: `${needsAttention} biomarcador${needsAttention === 1 ? '' : 'es'} a acompanhar`,
    danger: `${outOfRange} valor${outOfRange === 1 ? '' : 'es'} fora do range`,
  };

  const biomarkersToWatch = biomarkers.filter(b => b.attentionLevel !== 'dentro_do_esperado');

  const onScroll = useCallback((e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    Animated.timing(headerBg, {
      toValue: y > 10 ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, []);

  const headerBackgroundColor = headerBg.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(10,10,10,0)', 'rgba(10,10,10,0.92)'],
  });

  const isContentLoading = contentLoading || generating;
  const firstQuestion = questions.length > 0 ? questions[0] : null;

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      {/* Sticky Header */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          backgroundColor: headerBackgroundColor,
        }}
      >
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center justify-between" style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 }}>
            <Text className="text-xl font-bold text-white">Heartline</Text>
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/add-exam')}
                className="w-10 h-10 rounded-full bg-[#111111] border border-[#151515] items-center justify-center"
                activeOpacity={0.7}
              >
                <Plus size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/settings' as any)}
                className="w-10 h-10 rounded-full bg-[#111111] border border-[#151515] items-center justify-center"
                activeOpacity={0.7}
              >
                <User size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 56 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1D9E75" />
        }
        onScroll={onScroll}
        scrollEventThrottle={16}
      >

        {/* Hero — Orb */}
        {hasData ? (
          <>
            <Animated.View style={{ paddingVertical: 32, opacity: orbAnim, transform: [{ scale: orbScaleAnim }] }}>
              <PressableOrb onPress={() => router.push('/analysis' as any)}>
                <LuminousOrb status={overallStatus} />
              </PressableOrb>
            </Animated.View>
            <Animated.View className="items-center" style={{ marginTop: -8, marginBottom: 24, opacity: labelAnim }}>
              <Text className="text-white font-bold" style={{ fontSize: 28 }}>
                {statusLabel[overallStatus]}
              </Text>
              <Text className="text-[#666666]" style={{ fontSize: 14, marginTop: 4 }}>
                {statusSubtitle[overallStatus]}
              </Text>
            </Animated.View>

            {/* Metrics */}
            <Animated.View
              className="flex-row items-center border-t border-b border-[#151515]"
              style={{ paddingVertical: 16, opacity: metricsAnim }}
            >
              <TouchableOpacity onPress={() => router.push('/(tabs)/all-biomarkers' as any)} activeOpacity={0.7} style={{ flex: 1, alignItems: 'center' }}>
                <Text className="text-white font-bold" style={{ fontSize: 26 }}>{biomarkers.length}</Text>
                <Text className="text-[#555555]" style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>Total</Text>
              </TouchableOpacity>
              <View style={{ width: 1, height: 32, backgroundColor: '#151515' }} />
              <TouchableOpacity onPress={() => router.push('/(tabs)/all-biomarkers' as any)} activeOpacity={0.7} style={{ flex: 1, alignItems: 'center' }}>
                <Text className="text-[#1D9E75] font-bold" style={{ fontSize: 26 }}>{expected}</Text>
                <Text className="text-[#555555]" style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>Sem alertas</Text>
              </TouchableOpacity>
              <View style={{ width: 1, height: 32, backgroundColor: '#151515' }} />
              <TouchableOpacity onPress={() => router.push('/(tabs)/all-biomarkers' as any)} activeOpacity={0.7} style={{ flex: 1, alignItems: 'center' }}>
                <Text className="text-[#EF9F27] font-bold" style={{ fontSize: 26 }}>{toWatch}</Text>
                <Text className="text-[#555555]" style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>A acompanhar</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: '#151515', marginTop: 24 }} />

            {/* Insight Cards */}
            {isContentLoading && !cards ? (
              <View style={{ marginTop: 24, gap: 10 }}>
                <SkeletonCard lines={3} />
                <SkeletonCard />
                <SkeletonCard />
              </View>
            ) : cards ? (
              <Animated.View style={{ marginTop: 24, gap: 10, opacity: cardsAnim }}>
                {/* Card 1 — Main Insight (prominent) */}
                {cards.insight ? (
                  <TouchableOpacity
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/analysis' as any); }}
                    activeOpacity={0.8}
                    style={{ borderRadius: 16, overflow: 'hidden' }}
                  >
                    <LinearGradient
                      colors={['rgba(29,158,117,0.10)', 'rgba(29,158,117,0.02)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ padding: 20, borderWidth: 0.5, borderColor: 'rgba(29,158,117,0.15)', borderRadius: 16 }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(29,158,117,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                          <Sparkles size={18} color="#1D9E75" />
                        </View>
                        <Text style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: '#1D9E75', fontWeight: '600' }}>
                          A tua análise
                        </Text>
                      </View>
                      <Text style={{ fontSize: 15, lineHeight: 23, color: '#D4D4D4' }}>
                        {cards.insight}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 14 }}>
                        <Text style={{ fontSize: 13, color: '#1D9E75', fontWeight: '500' }}>
                          Ver análise completa
                        </Text>
                        <ChevronRight size={14} color="#1D9E75" />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : null}

                {/* Card 2 — Positive */}
                {cards.positive ? (
                  <View style={{ backgroundColor: '#111111', borderRadius: 16, padding: 18, flexDirection: 'row', gap: 14, alignItems: 'flex-start', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)' }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(29,158,117,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle size={18} color="#1D9E75" />
                    </View>
                    <Text style={{ fontSize: 14, lineHeight: 21, color: '#D4D4D4', flex: 1 }}>
                      {cards.positive}
                    </Text>
                  </View>
                ) : null}

                {/* Card 3 — Family History */}
                {cards.family_note ? (
                  <View style={{ backgroundColor: '#111111', borderRadius: 16, padding: 18, flexDirection: 'row', gap: 14, alignItems: 'flex-start', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)', borderLeftWidth: 2, borderLeftColor: '#EF9F27' }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(239,159,39,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                      <Heart size={18} color="#EF9F27" />
                    </View>
                    <Text style={{ fontSize: 14, lineHeight: 21, color: '#D4D4D4', flex: 1 }}>
                      {cards.family_note}
                    </Text>
                  </View>
                ) : null}

                {/* Card 4 — Doctor Question */}
                {firstQuestion ? (
                  <TouchableOpacity
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/analysis' as any); }}
                    activeOpacity={0.8}
                    style={{ borderRadius: 16, overflow: 'hidden' }}
                  >
                    <LinearGradient
                      colors={['rgba(29,158,117,0.08)', 'transparent']}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={{ padding: 18, flexDirection: 'row', gap: 14, alignItems: 'flex-start', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 16 }}
                    >
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(29,158,117,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                        <MessageSquare size={18} color="#1D9E75" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#555555', marginBottom: 6 }}>
                          Para o teu médico
                        </Text>
                        <Text
                          numberOfLines={2}
                          style={{ fontSize: 14, lineHeight: 21, color: '#D4D4D4', fontStyle: 'italic' }}
                        >
                          "{firstQuestion.question}"
                        </Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : null}
              </Animated.View>
            ) : null}

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: '#151515', marginTop: 24 }} />

            {/* Biomarkers to Watch */}
            <View style={{ marginTop: 24 }}>
              <Text className="text-[#555555]" style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, paddingHorizontal: 2 }}>
                A acompanhar
              </Text>

              {bioLoading && biomarkers.length === 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10 }}
                  style={{ marginHorizontal: -20, paddingHorizontal: 20 }}
                >
                  <SkeletonBiomarkerCard />
                  <SkeletonBiomarkerCard />
                  <SkeletonBiomarkerCard />
                </ScrollView>
              ) : biomarkersToWatch.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10 }}
                  style={{ marginHorizontal: -20, paddingHorizontal: 20 }}
                >
                  {biomarkersToWatch.map((b) => {
                    const dotColor = ATTENTION_COLORS[b.attentionLevel]?.text ?? '#EF9F27';
                    const sparkData = b.readings.map(r => r.value);
                    return (
                      <TouchableOpacity
                        key={b.name_normalized}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/biomarker/${b.name_normalized}` as any); }}
                        style={{
                          backgroundColor: '#111111',
                          borderWidth: 0.5,
                          borderColor: 'rgba(255,255,255,0.06)',
                          borderRadius: 16,
                          padding: 16,
                          minWidth: 150,
                          minHeight: 110,
                          justifyContent: 'space-between',
                        }}
                        activeOpacity={0.8}
                      >
                        {/* Dot */}
                        <View style={{ position: 'absolute', top: 14, right: 14, width: 6, height: 6, borderRadius: 3, backgroundColor: dotColor }} />
                        {/* Content */}
                        <View>
                          <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>
                            {b.name}
                          </Text>
                          <Text style={{ fontSize: 13, color: '#888888', marginTop: 3 }}>
                            {b.latestValue} {b.unit}
                          </Text>
                        </View>
                        {/* Sparkline */}
                        {sparkData.length >= 2 ? (
                          <View style={{ marginTop: 10 }}>
                            <Sparkline data={sparkData} width={100} height={24} color={dotColor} />
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : biomarkersToWatch.length === 0 ? (
                <View style={{ backgroundColor: '#111111', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 18 }}>
                  <Text style={{ fontSize: 14, color: '#888888' }}>Nenhum biomarcador requer atenção de momento</Text>
                </View>
              ) : null}

              {/* Ver todos */}
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/all-biomarkers' as any)}
                className="flex-row items-center"
                style={{ marginTop: 12, paddingHorizontal: 2, gap: 4 }}
                activeOpacity={0.7}
              >
                <Text className="text-[#1D9E75]" style={{ fontSize: 13 }}>
                  Ver todos os {biomarkers.length} biomarcadores
                </Text>
                <ChevronRight size={16} color="#1D9E75" />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          /* Empty state */
          !bioLoading && (
            <View>
              {/* Orb with subtle glow + particles — mirrors LuminousOrb structure */}
              <Animated.View style={{ paddingTop: 16, marginBottom: -40, opacity: orbAnim, transform: [{ scale: orbScaleAnim }] }}>
                <PressableOrb onPress={() => router.push('/(tabs)/add-exam')}>
                  <View style={{ width: 360, height: 360, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }}>
                    <OrbGlow color="#666666" size={360} />
                    {Array.from({ length: 10 }, (_, i) => (
                      <Particle key={i} color="#999999" containerSize={360} delay={i * 400} />
                    ))}
                    <View style={{ width: 160, height: 160, borderRadius: 80, overflow: 'hidden' }}>
                      <Image
                        source={ORB_IMAGES.empty}
                        style={{ width: 160, height: 160 }}
                        resizeMode="cover"
                      />
                    </View>
                  </View>
                </PressableOrb>
              </Animated.View>

              {/* Text + CTA */}
              <Animated.View style={{ alignItems: 'center', opacity: labelAnim, transform: [{ translateY: labelAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 }}>
                  Vamos começar
                </Text>
                <Text style={{ fontSize: 14, color: '#888888', textAlign: 'center', paddingHorizontal: 24, lineHeight: 20, marginBottom: 24 }}>
                  Adiciona o teu primeiro exame e o Heartline dá-te contexto sobre os teus dados.
                </Text>
                <TouchableOpacity
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/add-exam'); }}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: '#1D9E75',
                    borderRadius: 14,
                    paddingVertical: 18,
                    paddingHorizontal: 24,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    alignSelf: 'stretch',
                  }}
                >
                  <Camera size={20} color="#FFFFFF" />
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>Adicionar exame</Text>
                </TouchableOpacity>
              </Animated.View>

              {/* 3 step stepper */}
              <Animated.View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 24,
                gap: 10,
                opacity: stepsAnim,
                transform: [{ translateY: stepsAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
              }}>
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Camera size={16} color="#555555" />
                  <Text style={{ fontSize: 11, color: '#555555' }}>Fotografa</Text>
                </View>
                <ArrowRight size={12} color="#333333" />
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Sparkles size={16} color="#555555" />
                  <Text style={{ fontSize: 11, color: '#555555' }}>A IA analisa</Text>
                </View>
                <ArrowRight size={12} color="#333333" />
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Eye size={16} color="#555555" />
                  <Text style={{ fontSize: 11, color: '#555555' }}>Vê o contexto</Text>
                </View>
              </Animated.View>

              {/* Quote card */}
              <Animated.View style={{
                marginTop: 24,
                backgroundColor: '#111111',
                borderRadius: 16,
                padding: 16,
                flexDirection: 'row',
                gap: 12,
                alignItems: 'flex-start',
                opacity: quoteAnim,
                transform: [{ translateY: quoteAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
              }}>
                <Quote size={16} color="#333333" style={{ marginTop: 2 }} />
                <Text style={{ fontSize: 13, color: '#666666', fontStyle: 'italic', flex: 1, lineHeight: 19 }}>
                  A medicina analisa exames isoladamente. O Heartline cruza tudo e dá-te o contexto completo.
                </Text>
              </Animated.View>
            </View>
          )
        )}

        {/* Disclaimer (inline when has data) */}
        {hasData ? (
          <View className="flex-row items-center" style={{ marginTop: 24, gap: 10, paddingVertical: 16 }}>
            <Info size={14} color="#333333" />
            <Text style={{ fontSize: 11, color: '#333333', flex: 1 }}>
              O Heartline não substitui avaliação médica profissional.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Disclaimer fixed at bottom for empty state */}
      {!hasData && !bioLoading ? (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 20, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Info size={12} color="#333333" />
            <Text style={{ fontSize: 11, color: '#333333' }}>
              O Heartline não substitui avaliação médica profissional.
            </Text>
          </View>
        </View>
      ) : null}

      {/* Floating "Ask AI" button */}
      {hasData && cards ? (
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/analysis' as any); }}
          activeOpacity={0.85}
          style={{
            position: 'absolute',
            bottom: 32,
            right: 20,
            height: 48,
            paddingHorizontal: 20,
            borderRadius: 24,
            backgroundColor: '#1D9E75',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            shadowColor: '#1D9E75',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Sparkles size={18} color="#FFFFFF" />
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>
            Perguntar à IA
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
