import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0A0A0A" },
        gestureEnabled: true,
        animation: 'ios_from_right',
      }}
    />
  );
}
