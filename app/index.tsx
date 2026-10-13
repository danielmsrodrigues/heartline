import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/constants/theme';

export default function Index() {
  const t = useTheme();
  const { session, loading } = useAuth();

  // Enquanto a sessão carrega, o ecrã de arranque do layout está por cima.
  if (loading) return <View style={{ flex: 1, backgroundColor: t.bg[0] }} />;
  if (!session) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(tabs)" />;
}
