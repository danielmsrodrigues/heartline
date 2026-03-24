import { View, Text, TouchableOpacity, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

// Configure Google Sign-In
// Replace with your Web Client ID from Google Cloud Console
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

if (GOOGLE_WEB_CLIENT_ID) {
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
}

export function SocialAuthButtons() {
  const [loading, setLoading] = useState<'apple' | 'google' | null>(null);

  const handleAppleSignIn = async () => {
    try {
      setLoading('apple');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('No identity token');
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) throw error;

      // Apple only provides name on first sign-in, save it
      if (credential.fullName?.givenName) {
        const name = [credential.fullName.givenName, credential.fullName.familyName]
          .filter(Boolean)
          .join(' ');
        await supabase.auth.updateUser({ data: { full_name: name } });
      }
    } catch (err: any) {
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        console.error('Apple sign-in error:', err);
        Alert.alert('Erro', 'Não foi possível iniciar sessão com Apple.');
      }
    } finally {
      setLoading(null);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!GOOGLE_WEB_CLIENT_ID) {
      Alert.alert('Configuração em falta', 'Google Sign-In ainda não está configurado.');
      return;
    }

    try {
      setLoading('google');
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      const idToken = response.data?.idToken;
      if (!idToken) {
        throw new Error('No ID token');
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) throw error;
    } catch (err: any) {
      if (err.code !== 'SIGN_IN_CANCELLED') {
        console.error('Google sign-in error:', err);
        Alert.alert('Erro', 'Não foi possível iniciar sessão com Google.');
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <View className="mt-6">
      {/* Divider */}
      <View className="flex-row items-center mb-6">
        <View className="flex-1 h-px bg-gray-200" />
        <Text className="text-xs text-gray-400 mx-3">ou continuar com</Text>
        <View className="flex-1 h-px bg-gray-200" />
      </View>

      {/* Apple Sign-In (iOS only) */}
      {Platform.OS === 'ios' && (
        <TouchableOpacity
          onPress={handleAppleSignIn}
          disabled={loading !== null}
          className="flex-row items-center justify-center bg-black rounded-xl py-3.5 mb-3"
          activeOpacity={0.8}
        >
          <Ionicons name="logo-apple" size={20} color="white" />
          <Text className="text-white font-semibold text-base ml-2">
            {loading === 'apple' ? 'A iniciar sessão...' : 'Continuar com Apple'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Google Sign-In */}
      <TouchableOpacity
        onPress={handleGoogleSignIn}
        disabled={loading !== null}
        className="flex-row items-center justify-center bg-white border border-gray-200 rounded-xl py-3.5"
        activeOpacity={0.8}
      >
        <Ionicons name="logo-google" size={18} color="#4285F4" />
        <Text className="text-gray-700 font-semibold text-base ml-2">
          {loading === 'google' ? 'A iniciar sessão...' : 'Continuar com Google'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
