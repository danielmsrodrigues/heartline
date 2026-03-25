import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#ffffff" },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="welcome" />
      <Stack.Screen
        name="forgot-password"
        options={{
          headerShown: true,
          title: 'Recuperar palavra-passe',
          headerStyle: { backgroundColor: '#0A0A0A' },
          headerTintColor: '#F5F5F5',
          headerTitleStyle: { color: '#F5F5F5', fontWeight: '600' },
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}
