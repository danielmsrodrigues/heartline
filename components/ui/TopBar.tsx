import { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/constants/theme';
import { Glass } from './Glass';
import { Icon } from './Icon';

interface TopBarProps {
  title?: string;
  /** Conteúdo ao centro em vez do título (logótipo). */
  center?: ReactNode;
  /** Passo atual do processo de arranque (1 a `steps`). */
  progress?: number;
  steps?: number;
  /** false esconde o botão de voltar. */
  back?: boolean;
  onBack?: () => void;
  right?: ReactNode;
}

/** Barra de topo dos ecrãs empilhados: voltar em vidro, título ou progresso ao centro. */
export function TopBar({ title, center, progress, steps = 3, back = true, onBack, right }: TopBarProps) {
  const t = useTheme();
  const router = useRouter();
  return (
    <View style={{ height: 44, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 44, height: 44 }}>
        {back ? (
          <Glass
            radius={22}
            flat
            onPress={onBack ?? (() => router.back())}
            accessibilityLabel="Voltar"
            style={{ width: 44, height: 44 }}
            contentStyle={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="back" size={19} color={t.ink} />
          </Glass>
        ) : null}
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }}>
        {progress ? (
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`Passo ${progress} de ${steps}`}
            style={{ flexDirection: 'row', gap: 6, alignSelf: 'stretch', paddingHorizontal: 8 }}
          >
            {Array.from({ length: steps }, (_, i) => (
              <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i < progress ? t.primaryBg : t.track }} />
            ))}
          </View>
        ) : center ? (
          center
        ) : (
          <Text accessibilityRole="header" numberOfLines={1} style={{ fontSize: 17, fontWeight: '600', color: t.ink }}>{title}</Text>
        )}
      </View>
      <View style={{ width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center' }}>{right}</View>
    </View>
  );
}
