import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { useTheme } from '@/constants/theme';

// Menu nativo do sistema (Liquid Glass no iOS 26). A ordem segue o uso:
// ver, consultar, adicionar, perguntar, e o perfil no fim.
export default function TabLayout() {
  const t = useTheme();
  return (
    <NativeTabs tintColor={t.ink}>
      <NativeTabs.Trigger name="index">
        <Label>Início</Label>
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="values">
        <Label>Valores</Label>
        <Icon sf="chart.xyaxis.line" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="add-exam">
        <Label>Adicionar</Label>
        <Icon sf={{ default: 'camera', selected: 'camera.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ask">
        <Label>Perguntar</Label>
        <Icon sf={{ default: 'bubble.left', selected: 'bubble.left.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Label>Perfil</Label>
        <Icon sf={{ default: 'person', selected: 'person.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
