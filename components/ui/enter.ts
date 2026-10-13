import { withDelay, withSpring } from 'react-native-reanimated';

/**
 * Entrada de cartões: sobem e crescem ligeiramente. Não mexe na opacidade de
 * propósito — o Liquid Glass não chega a desenhar se for montado dentro de uma
 * vista a desvanecer.
 */
export const riseIn = (delay = 0) => () => {
  'worklet';
  const spring = { damping: 18, stiffness: 170 };
  return {
    initialValues: { transform: [{ translateY: 26 }, { scale: 0.95 }] },
    animations: {
      transform: [
        { translateY: withDelay(delay, withSpring(0, spring)) },
        { scale: withDelay(delay, withSpring(1, spring)) },
      ],
    },
  };
};

/** Entrada de um passo novo num fluxo: desliza da direita. Também sem opacidade, pela mesma razão. */
export const slideIn = () => {
  'worklet';
  return {
    initialValues: { transform: [{ translateX: 44 }] },
    animations: { transform: [{ translateX: withSpring(0, { damping: 20, stiffness: 190 }) }] },
  };
};
