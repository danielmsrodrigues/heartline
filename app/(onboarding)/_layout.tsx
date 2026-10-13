import { Stack } from 'expo-router';
import { useTheme } from '@/constants/theme';

export default function OnboardingLayout() {
  const t = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: t.bg[0] },
        gestureEnabled: true,
        animation: 'ios_from_right',
      }}
    />
  );
}
