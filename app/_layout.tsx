import { useEffect, useState, useCallback } from 'react';
import { Keyboard } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import '@/global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

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
  }, [checkOnboarding]);

  // Re-check when navigating between groups (catches onboarding completion)
  useEffect(() => {
    if (session && onboardingChecked) {
      checkOnboarding();
    }
  }, [segments[0]]);

  useEffect(() => {
    if (loading || !onboardingChecked) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (!session && !inAuthGroup) {
      Keyboard.dismiss();
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      Keyboard.dismiss();
      if (onboardingCompleted) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(onboarding)/profile');
      }
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
  }, [session, loading, onboardingChecked, onboardingCompleted, segments]);

  useEffect(() => {
    if (!loading && onboardingChecked) {
      SplashScreen.hideAsync();
    }
  }, [loading, onboardingChecked]);

  return (
    <>
      <StatusBar style="dark" />
      <Slot />
    </>
  );
}
