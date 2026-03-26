import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Keyboard, View, Text, Image, Animated, Easing, Platform } from 'react-native';
import { Asset } from 'expo-asset';
import Svg, { Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import '@/global.css';

// Context so onboarding screens can tell the layout "I'm done"
type OnboardingCtx = { markOnboardingDone: () => void };
const OnboardingContext = createContext<OnboardingCtx>({ markOnboardingDone: () => {} });
export function useOnboardingContext() { return useContext(OnboardingContext); }

SplashScreen.preventAutoHideAsync();

function SplashGlow({ size }: { size: number }) {
  return (
    <View style={{ position: 'absolute', width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="splashGlow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="#1D9E75" stopOpacity="0.35" />
            <Stop offset="50%" stopColor="#1D9E75" stopOpacity="0.12" />
            <Stop offset="100%" stopColor="#1D9E75" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx={size / 2} cy={size / 2} rx={size / 2} ry={size / 2} fill="url(#splashGlow)" />
      </Svg>
    </View>
  );
}

function HeartbeatSplash({ onIntroComplete, dismiss }: { onIntroComplete: () => void; dismiss: boolean }) {
  const orbOpacity = useRef(new Animated.Value(0)).current;
  const orbScale = useRef(new Animated.Value(0.8)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const wrapperOpacity = useRef(new Animated.Value(1)).current;
  const easeOut = Easing.out(Easing.ease);
  const easeIO = Easing.inOut(Easing.ease);
  const dismissed = useRef(false);
  const introComplete = useRef(false);
  const alive = useRef(true);

  // Heartbeat: TUM-tum with original snappy feel, slower rhythm
  const beat = useCallback(() => {
    return new Promise<void>((resolve) => {
      // TUM — strong systolic beat
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Animated.timing(orbScale, { toValue: 1.12, duration: 80, easing: easeOut, useNativeDriver: true }).start(() => {
        Animated.timing(orbScale, { toValue: 1.02, duration: 120, easing: easeIO, useNativeDriver: true }).start(() => {
          // tum — soft diastolic echo
          setTimeout(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Animated.timing(orbScale, { toValue: 1.06, duration: 60, easing: easeOut, useNativeDriver: true }).start(() => {
              Animated.timing(orbScale, { toValue: 1, duration: 200, easing: easeIO, useNativeDriver: true }).start(() => resolve());
            });
          }, 40);
        });
      });
    });
  }, []);

  useEffect(() => {
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    alive.current = true;

    (async () => {
      // FadeIn orb
      Animated.parallel([
        Animated.timing(orbOpacity, { toValue: 1, duration: 600, easing: easeOut, useNativeDriver: true }),
        Animated.timing(orbScale, { toValue: 1, duration: 600, easing: easeOut, useNativeDriver: true }),
      ]).start();
      await wait(700);

      // FadeIn text
      Animated.timing(textOpacity, { toValue: 1, duration: 300, easing: easeOut, useNativeDriver: true }).start();
      await wait(400);

      // Heartbeat loop — ~55bpm, long rest between beats
      while (alive.current) {
        await beat();
        await wait(1100);
      }
    })();

    // Signal intro complete after first beat
    const t = setTimeout(() => {
      introComplete.current = true;
      onIntroComplete();
    }, 1800);

    return () => { alive.current = false; clearTimeout(t); };
  }, []);

  // Phase 2: Exit — stop heartbeat, fade out smoothly from current state
  useEffect(() => {
    if (!dismiss || dismissed.current) return;
    dismissed.current = true;
    alive.current = false;

    // Stop any running beat animation, then smoothly exit from wherever we are
    orbScale.stopAnimation(() => {
      Animated.parallel([
        Animated.timing(orbScale, { toValue: 1.3, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(wrapperOpacity, { toValue: 0, duration: 600, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ]).start();
    });
  }, [dismiss]);

  return (
    <Animated.View
      style={{ opacity: wrapperOpacity }}
      className="absolute inset-0 bg-[#0A0A0A] items-center justify-center z-50"
      pointerEvents={dismiss ? 'none' : 'auto'}
    >
      <Animated.View
        style={{
          opacity: orbOpacity,
          transform: [{ scale: orbScale }],
          alignItems: 'center',
          justifyContent: 'center',
          width: 240,
          height: 240,
        }}
      >
        <SplashGlow size={240} />
        <View style={{ width: 120, height: 120, borderRadius: 60, overflow: 'hidden' }}>
          <Image
            source={require('@/assets/images/splash-orb.png')}
            style={{ width: 120, height: 120 }}
            resizeMode="cover"
          />
        </View>
      </Animated.View>
      <Animated.Text
        style={{ opacity: textOpacity, fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginTop: 16 }}
      >
        Heartline
      </Animated.Text>
    </Animated.View>
  );
}

export default function RootLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [splashAnimDone, setSplashAnimDone] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Pre-cache images so they appear instantly on auth screens
  useEffect(() => {
    Asset.loadAsync([
      require('@/assets/images/splash-orb.png'),
      require('@/assets/images/orb-good.png'),
      require('@/assets/images/orb-empty.png'),
      require('@/assets/images/orb-warning.png'),
      require('@/assets/images/orb-danger.png'),
    ]);
  }, []);

  // These are null/undefined until loaded
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  // Sync hasSeenWelcome from AsyncStorage — re-reads on any navigation and session changes
  const segmentKey = segments.join('/');
  useEffect(() => {
    AsyncStorage.getItem('has_seen_welcome').then((v) => {
      setHasSeenWelcome(v === 'true');
    });
  }, [segmentKey, session]);

  // Load onboarding status from DB when session changes
  useEffect(() => {
    if (loading) return;
    if (!session) {
      setOnboardingCompleted(null);
      return;
    }
    let cancelled = false;
    supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          // No profile row yet (new user) or error — treat as not completed
          setOnboardingCompleted(false);
        } else {
          setOnboardingCompleted(data.onboarding_completed ?? false);
        }
      })
      .then(undefined, () => {
        if (!cancelled) setOnboardingCompleted(false);
      });
    return () => { cancelled = true; };
  }, [session, loading]);

  // Determine the target destination — use splashAnimDone (not showSplash) so we navigate BEFORE hiding overlay
  const ready = !loading && splashAnimDone && hasSeenWelcome !== null;
  const fullyReady = ready && (!session || onboardingCompleted !== null);
  const lastNav = useRef('');
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (!fullyReady) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';
    const inTabs = segments[0] === '(tabs)';

    let target = '';

    const isFirstNav = !hasNavigated.current;

    if (!session) {
      if (!hasSeenWelcome) {
        // Must see welcome — only skip if already there
        if (inAuth && segments[1] === 'welcome') return;
        target = '/(auth)/welcome';
      } else {
        // Already seen welcome — let user be in any auth screen freely
        if (inAuth && !isFirstNav) return;
        target = '/(auth)/login';
      }
    } else if (!onboardingCompleted) {
      if (inOnboarding && !isFirstNav) return;
      target = '/(onboarding)/profile';
    } else {
      if (inTabs) return;
      target = '/(tabs)';
    }

    if (!target || target === lastNav.current) return;

    lastNav.current = target;
    hasNavigated.current = true;
    Keyboard.dismiss();
    router.replace(target as any);
  }, [fullyReady, session, hasSeenWelcome, onboardingCompleted, segmentKey]);

  // Dismiss splash when segments match the intended destination
  const [dismissSplash, setDismissSplash] = useState(false);
  useEffect(() => {
    if (!splashAnimDone || !fullyReady || !hasNavigated.current || dismissSplash) return;

    const target = lastNav.current;
    const currentPath = '/' + segments.join('/');

    if (currentPath.startsWith(target)) {
      setDismissSplash(true);
      setTimeout(() => setShowSplash(false), 500);
    }
  }, [splashAnimDone, fullyReady, segmentKey, dismissSplash]);

  // Safety: force dismiss splash after 8s no matter what
  useEffect(() => {
    const t = setTimeout(() => {
      if (showSplash) {
        setDismissSplash(true);
        setTimeout(() => setShowSplash(false), 500);
      }
    }, 8000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loading && hasSeenWelcome !== null) {
      SplashScreen.hideAsync();
    }
  }, [loading, hasSeenWelcome]);

  const markOnboardingDone = useCallback(() => setOnboardingCompleted(true), []);

  return (
    <OnboardingContext.Provider value={{ markOnboardingDone }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0A0A' } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="confirm-values"
          options={{
            presentation: 'card',
            gestureEnabled: true,
            headerShown: true,
            title: 'Confirmar valores',
            headerBackButtonDisplayMode: 'minimal',
            headerStyle: { backgroundColor: '#0A0A0A' },
            headerTintColor: '#F5F5F5',
            headerTitleStyle: { color: '#F5F5F5', fontWeight: '600' },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="biomarker/[id]"
          options={{
            presentation: 'card',
            gestureEnabled: true,
            headerShown: true,
            title: '',
            headerBackButtonDisplayMode: 'minimal',
            headerStyle: { backgroundColor: '#0A0A0A' },
            headerTintColor: '#F5F5F5',
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="analysis"
          options={{
            presentation: 'card',
            gestureEnabled: true,
            headerShown: true,
            title: 'A tua análise',
            headerBackButtonDisplayMode: 'minimal',
            headerStyle: { backgroundColor: '#0A0A0A' },
            headerTintColor: '#F5F5F5',
            headerTitleStyle: { color: '#F5F5F5', fontWeight: '600' },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="reset-password"
          options={{ presentation: 'card', gestureEnabled: false }}
        />
      </Stack>
      {showSplash && (
        <HeartbeatSplash
          onIntroComplete={() => setSplashAnimDone(true)}
          dismiss={dismissSplash}
        />
      )}
    </OnboardingContext.Provider>
  );
}
