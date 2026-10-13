import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Háptica com parcimónia: só em escolhas, ações principais e resultados.
// Navegação, scroll e toques em linhas de lista não vibram.
const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

function run(fn: () => Promise<void>) {
  if (!enabled) return;
  fn().catch(() => {});
}

export const haptics = {
  /** Escolher uma opção (chips, caixas de seleção). */
  select: () => run(() => Haptics.selectionAsync()),
  /** Ação principal de um ecrã e toque no boneco. */
  press: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Algo ficou guardado ou concluído. */
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Algo falhou ou precisa de atenção antes de continuar. */
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
