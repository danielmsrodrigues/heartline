import { useEffect, useState, useCallback, useRef } from 'react';
import { Keyboard, View, Text, Image, Animated } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import '@/global.css';

SplashScreen.preventAutoHideAsync();

function HeartbeatSplash({ onFinish }: { onFinish: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    // TUM — strong beat
    const tum = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      return new Promise<void>((resolve) => {
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.25,
            duration: 90,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1.0,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start(() => resolve());
      });
    };

    // tum — soft echo
    const tumSoft = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
      return new Promise<void>((resolve) => {
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.08,
            duration: 70,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1.0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => resolve());
      });
    };

    (async () => {
      await wait(400);

      // TUM tum
      await tum();
      await wait(30);
      await tumSoft();

      // ...... long pause
      await wait(900);

      // TUM tum
      await tum();
      await wait(30);
      await tumSoft();

      await wait(350);

      // Fade out
      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => onFinish());
    })();
  }, []);

  return (
    <Animated.View
      style={{ opacity }}
      className="absolute inset-0 bg-[#0A0A0A] items-center justify-center z-50"
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={{ width: 120, height: 120 }}
          resizeMode="contain"
        />
      </Animated.View>
      <Text className="text-sm text-[#555555] mt-4">
        O contexto completo da tua saúde
      </Text>
    </Animated.View>
  );
}

export default function RootLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  const checkOnboarding = useCallback(async () => {
    if (!session) {
      setOnboardingCompleted(false);
      setOnboardingChecked(true);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', session.user.id)
      .single();
    setOnboardingCompleted(data?.onboarding_completed ?? false);
    setOnboardingChecked(true);
  }, [session]);

  useEffect(() => {
    checkOnboarding();
    AsyncStorage.getItem('has_seen_welcome').then((v) => setHasSeenWelcome(v === 'true'));
  }, [checkOnboarding]);

  // Re-check when navigating between groups (catches onboarding completion)
  useEffect(() => {
    if (session && onboardingChecked) {
      checkOnboarding();
    }
  }, [segments[0]]);

  useEffect(() => {
    if (loading || !onboardingChecked || showSplash || hasSeenWelcome === null) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (!session && !inAuthGroup) {
      Keyboard.dismiss();
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      Keyboard.dismiss();
      if (!hasSeenWelcome) {
        router.replace('/(auth)/welcome' as any);
      } else if (onboardingCompleted) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(onboarding)/profile');
      }
    } else if (session && !hasSeenWelcome && !inAuthGroup) {
      router.replace('/(auth)/welcome' as any);
    } else if (
      session &&
      !onboardingCompleted &&
      !inOnboardingGroup &&
      !inAuthGroup
    ) {
      router.replace('/(onboarding)/profile');
    } else if (session && onboardingCompleted && inOnboardingGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, onboardingChecked, onboardingCompleted, segments, showSplash, hasSeenWelcome]);

  // Update hasSeenWelcome when navigating away from welcome
  useEffect(() => {
    if (hasSeenWelcome === false) {
      AsyncStorage.getItem('has_seen_welcome').then((v) => {
        if (v === 'true') setHasSeenWelcome(true);
      });
    }
  }, [segments]);

  useEffect(() => {
    if (!loading && onboardingChecked) {
      SplashScreen.hideAsync();
    }
  }, [loading, onboardingChecked]);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
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
            title: 'Análise completa',
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
        <HeartbeatSplash onFinish={() => setShowSplash(false)} />
      )}
    </>
  );
}
