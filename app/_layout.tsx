import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Keyboard, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/query';
import { useTheme } from '@/constants/theme';
import { Logo, WORDMARK_FONT } from '@/components/logo';
import '@/global.css';

// Context so onboarding screens can tell the layout "I'm done"
type OnboardingCtx = { markOnboardingDone: () => void };
const OnboardingContext = createContext<OnboardingCtx>({ markOnboardingDone: () => {} });
export function useOnboardingContext() { return useContext(OnboardingContext); }

SplashScreen.preventAutoHideAsync();

/** Tamanho do símbolo: igual ao `imageWidth` do splash nativo (app.json), para a passagem não se notar. */
const SPLASH_LOGO = 128;

/**
 * Continuação do splash nativo: o mesmo logo, no mesmo sítio, sobre a mesma cor.
 * O ponto pulsa, o nome aparece e tudo desvanece quando a app está pronta.
 */
function LogoSplash({ onIntroComplete, dismiss }: { onIntroComplete: () => void; dismiss: boolean }) {
  const t = useTheme();
  const wrapper = useSharedValue(1);
  const name = useSharedValue(0);

  useEffect(() => {
    name.value = withDelay(350, withTiming(1, { duration: 450 }));
    const timer = setTimeout(onIntroComplete, 1100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (dismiss) wrapper.value = withTiming(0, { duration: 420 });
  }, [dismiss, wrapper]);

  const wrapperStyle = useAnimatedStyle(() => ({ opacity: wrapper.value }));
  const nameStyle = useAnimatedStyle(() => ({ opacity: name.value, transform: [{ translateY: (1 - name.value) * 6 }] }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.splash, { backgroundColor: t.dark ? '#100F19' : '#F3F2F7' }, wrapperStyle]}
      pointerEvents={dismiss ? 'none' : 'auto'}
    >
      <Logo size={SPLASH_LOGO} animated />
      <Animated.Text style={[styles.splashName, { color: t.ink, top: '50%', marginTop: SPLASH_LOGO / 2 + 4 }, nameStyle]}>
        Heartline
      </Animated.Text>
    </Animated.View>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const t = useTheme();
  const { session, loading } = useAuth();
  // Sem os tipos de rotas gerados pelo Expo (no CI), o tuplo teria só um elemento.
  const segments: string[] = useSegments();
  const router = useRouter();
  const [splashAnimDone, setSplashAnimDone] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  // O nome do logo usa Manrope; se a fonte falhar, segue com a do sistema.
  const [fontsLoaded, fontError] = useFonts({ Manrope_600SemiBold });
  const fontsReady = fontsLoaded || !!fontError;

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

    // O link de recuperação abre este ecrã sem sessão: é ele que troca o
    // código por uma sessão, por isso nunca se redireciona daqui para fora.
    if (segments[0] === 'reset-password') {
      lastNav.current = '/reset-password';
      hasNavigated.current = true;
      return;
    }

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
      // Allow root-level screens (confirm-values, analysis, biomarker detail, reset-password)
      if (inTabs || (!inAuth && !inOnboarding)) return;
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
    const timer = setTimeout(() => {
      setDismissSplash(true);
      setTimeout(() => setShowSplash(false), 500);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  // O splash nativo sai assim que o de JS (igual) está montado por baixo.
  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync();
  }, [fontsReady]);

  const markOnboardingDone = useCallback(() => setOnboardingCompleted(true), []);

  return (
    <OnboardingContext.Provider value={{ markOnboardingDone }}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg[0] } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="confirm-values" options={{ presentation: 'card', gestureEnabled: true }} />
        <Stack.Screen name="biomarker/[id]" options={{ presentation: 'card', gestureEnabled: true }} />
        <Stack.Screen name="analysis" options={{ presentation: 'card', gestureEnabled: true }} />
        <Stack.Screen name="reset-password" options={{ presentation: 'card', gestureEnabled: false }} />
      </Stack>
      {showSplash && fontsReady && (
        <LogoSplash onIntroComplete={() => setSplashAnimDone(true)} dismiss={dismissSplash} />
      )}
    </OnboardingContext.Provider>
  );
}

const styles = StyleSheet.create({
  splash: { alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  splashName: { position: 'absolute', fontFamily: WORDMARK_FONT, fontSize: 28, letterSpacing: -0.8 },
});
