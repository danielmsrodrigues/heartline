import { useEffect } from 'react';
import { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';

/** Flutuação lenta para cima e para baixo. Com atrasos diferentes, os elementos não sobem todos ao mesmo tempo. */
export function useFloat(delay: number, distance: number, duration = 2600) {
  const value = useSharedValue(0);
  useEffect(() => {
    value.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [delay, duration, value]);
  return useAnimatedStyle(() => ({ transform: [{ translateY: (value.value - 0.5) * distance }] }));
}
