import { View, Text } from 'react-native';
import { Shield, Heart, Cigarette, Dumbbell, Briefcase, Moon } from 'lucide-react-native';
import { Card } from './ui/Card';
import { Profile, FamilyHistoryEntry } from '@/lib/types';

interface HealthContextCardProps {
  profile: Profile;
  familyHistory: FamilyHistoryEntry[];
}

const EVENT_LABELS: Record<string, string> = {
  enfarte: 'Enfarte',
  avc: 'AVC',
  trombose: 'Trombose',
  morte_subita: 'Morte súbita',
  outro: 'Outro evento',
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  pai: 'Pai',
  mae: 'Mãe',
  irmao: 'Irmão',
  irma: 'Irmã',
  avo_paterno: 'Avô paterno',
  avo_materno: 'Avô materno',
  avó_paterna: 'Avó paterna',
  avó_materna: 'Avó materna',
  tio: 'Tio',
  tia: 'Tia',
};

function ContextRow({
  icon: Icon,
  iconColor,
  bgColor,
  label,
  type,
}: {
  icon: React.ComponentType<any>;
  iconColor: string;
  bgColor: string;
  label: string;
  type: 'positive' | 'attention' | 'neutral';
}) {
  return (
    <View className="flex-row items-center" style={{ marginBottom: 12 }}>
      <View
        className="w-8 h-8 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: bgColor }}
      >
        <Icon size={16} color={iconColor} />
      </View>
      <Text className="text-base text-[#F5F5F5] flex-1">{label}</Text>
      {type === 'positive' && (
        <View style={{ backgroundColor: 'rgba(140,179,105,0.2)' }} className="px-2 py-0.5 rounded-full">
          <Text style={{ fontSize: 12, color: '#1D9E75', fontWeight: '500' }}>Protector</Text>
        </View>
      )}
      {type === 'attention' && (
        <View style={{ backgroundColor: 'rgba(232,151,58,0.2)' }} className="px-2 py-0.5 rounded-full">
          <Text style={{ fontSize: 12, color: '#EF9F27', fontWeight: '500' }}>Considerar</Text>
        </View>
      )}
    </View>
  );
}

export function HealthContextCard({ profile, familyHistory }: HealthContextCardProps) {
  const factors: {
    icon: React.ComponentType<any>;
    iconColor: string;
    bgColor: string;
    label: string;
    type: 'positive' | 'attention' | 'neutral';
    order: number;
  }[] = [];

  // Family history
  if (familyHistory.length > 0) {
    familyHistory.forEach((fh) => {
      const rel = RELATIONSHIP_LABELS[fh.relationship] || fh.relationship;
      const event = EVENT_LABELS[fh.event_type] || fh.event_type;
      const age = fh.event_age ? ` aos ${fh.event_age} anos` : '';
      factors.push({
        icon: Heart,
        iconColor: '#EF9F27',
        bgColor: 'rgba(232,151,58,0.2)',
        label: `${rel}: ${event}${age}`,
        type: 'attention',
        order: 0,
      });
    });
  } else {
    factors.push({
      icon: Heart,
      iconColor: '#555555',
      bgColor: 'rgba(107,114,128,0.2)',
      label: 'Sem histórico familiar registado',
      type: 'neutral',
      order: 0,
    });
  }

  // Smoking
  if (profile.smoker) {
    factors.push({
      icon: Cigarette,
      iconColor: '#EF9F27',
      bgColor: 'rgba(232,151,58,0.2)',
      label: 'Fumador',
      type: 'attention',
      order: 1,
    });
  } else {
    factors.push({
      icon: Cigarette,
      iconColor: '#1D9E75',
      bgColor: 'rgba(140,179,105,0.2)',
      label: 'Não fumador',
      type: 'positive',
      order: 1,
    });
  }

  // Exercise
  if (profile.exercise_minutes_per_week && profile.exercise_minutes_per_week >= 150) {
    factors.push({
      icon: Dumbbell,
      iconColor: '#1D9E75',
      bgColor: 'rgba(140,179,105,0.2)',
      label: `${profile.exercise_minutes_per_week} min/semana exercício`,
      type: 'positive',
      order: 2,
    });
  } else if (profile.exercise_minutes_per_week && profile.exercise_minutes_per_week > 0) {
    factors.push({
      icon: Dumbbell,
      iconColor: '#4A90D9',
      bgColor: 'rgba(74,144,217,0.2)',
      label: `${profile.exercise_minutes_per_week} min/semana exercício`,
      type: 'neutral',
      order: 2,
    });
  } else if (profile.exercise_minutes_per_week === 0) {
    factors.push({
      icon: Dumbbell,
      iconColor: '#EF9F27',
      bgColor: 'rgba(232,151,58,0.2)',
      label: 'Sem exercício registado',
      type: 'attention',
      order: 2,
    });
  }

  // Sedentary work
  if (profile.sedentary_work) {
    factors.push({
      icon: Briefcase,
      iconColor: '#EF9F27',
      bgColor: 'rgba(232,151,58,0.2)',
      label: 'Trabalho sedentário',
      type: 'attention',
      order: 3,
    });
  }

  // Sleep
  if (profile.sleep_hours_avg && profile.sleep_hours_avg >= 7) {
    factors.push({
      icon: Moon,
      iconColor: '#1D9E75',
      bgColor: 'rgba(140,179,105,0.2)',
      label: `${profile.sleep_hours_avg}h sono`,
      type: 'positive',
      order: 4,
    });
  } else if (profile.sleep_hours_avg && profile.sleep_hours_avg > 0) {
    factors.push({
      icon: Moon,
      iconColor: '#EF9F27',
      bgColor: 'rgba(232,151,58,0.2)',
      label: `${profile.sleep_hours_avg}h sono`,
      type: 'attention',
      order: 4,
    });
  }

  factors.sort((a, b) => a.order - b.order);

  const attentionCount = factors.filter((f) => f.type === 'attention').length;
  const positiveCount = factors.filter((f) => f.type === 'positive').length;

  return (
    <Card className="mt-5 p-5">
      {/* Title */}
      <View className="flex-row items-center mb-4">
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: 'rgba(74,144,217,0.2)' }}
        >
          <Shield size={20} color="#4A90D9" />
        </View>
        <Text className="text-lg font-medium text-[#F5F5F5]">
          O teu contexto de saúde
        </Text>
      </View>

      {/* Summary badges */}
      <View className="flex-row mb-4">
        {positiveCount > 0 && (
          <View style={{ backgroundColor: 'rgba(140,179,105,0.2)' }} className="rounded-full px-3 py-1.5 mr-2">
            <Text className="text-sm font-medium text-[#1D9E75]">
              {positiveCount} {positiveCount === 1 ? 'factor protector' : 'factores protectores'}
            </Text>
          </View>
        )}
        {attentionCount > 0 && (
          <View style={{ backgroundColor: 'rgba(232,151,58,0.2)' }} className="rounded-full px-3 py-1.5">
            <Text className="text-sm font-medium text-[#EF9F27]">
              {attentionCount} a considerar
            </Text>
          </View>
        )}
      </View>

      {/* Factor list */}
      <View>
        {factors.map((f, i) => (
          <ContextRow
            key={i}
            icon={f.icon}
            iconColor={f.iconColor}
            bgColor={f.bgColor}
            label={f.label}
            type={f.type}
          />
        ))}
      </View>

      {/* Footer */}
      <View className="border-t border-[#151515] pt-3 mt-1">
        <Text className="text-sm text-[#555555]">
          Estes dados influenciam a análise dos biomarcadores
        </Text>
      </View>
    </Card>
  );
}
