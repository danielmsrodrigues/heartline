import { View, Text, Image, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export function SocialAuthButtons() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);

      const { GoogleSignin } = await import('@react-native-google-signin/google-signin');

      GoogleSignin.configure({
        webClientId: '496114473281-4o8219vqi0u8qt0qap98s6db2tjgg252.apps.googleusercontent.com',
      });

      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (response.data?.idToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: response.data.idToken,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      // Ignore user cancel
      if (err?.code === '12501' || err?.code === 'SIGN_IN_CANCELLED') return;
      console.error('Google sign-in error:', err);
      Alert.alert('Erro', 'Não foi possível iniciar sessão com Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="mt-6">
      {/* Divider */}
      <View className="flex-row items-center mb-6">
        <View className="flex-1 h-px bg-[#151515]" />
        <Text className="text-xs text-[#555555] mx-3">ou continuar com</Text>
        <View className="flex-1 h-px bg-[#151515]" />
      </View>

      {/* Google Sign-In */}
      <TouchableOpacity
        onPress={handleGoogleSignIn}
        disabled={loading}
        className="flex-row items-center justify-center bg-[#111111] border border-[#151515] rounded-xl py-3.5"
        activeOpacity={0.8}
      >
        <Image
          source={require('@/assets/images/google-logo.png')}
          style={{ width: 18, height: 18 }}
          resizeMode="contain"
        />
        <Text className="text-[#F5F5F5] font-semibold text-base ml-2">
          {loading ? 'A iniciar sessão...' : 'Continuar com Google'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
