import { Stack } from 'expo-router';

export default function TabLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A0A0A' },
        animation: 'ios_from_right',
        gestureEnabled: true,
        animationDuration: 150,
        headerBackButtonDisplayMode: 'minimal',
        headerStyle: { backgroundColor: '#0A0A0A' },
        headerTintColor: '#F5F5F5',
        headerTitleStyle: { color: '#F5F5F5', fontWeight: '600' as const },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="settings" options={{ headerShown: true, title: 'Definições' }} />
      <Stack.Screen name="all-biomarkers" options={{ headerShown: true, title: 'Todos os biomarcadores' }} />
      <Stack.Screen name="add-exam" options={{ headerShown: true, title: 'Adicionar exame' }} />
    </Stack>
  );
}
