import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './ui/Card';
import { HealthData } from '@/hooks/useHealthKit';

interface HealthDataCardProps {
  data: HealthData;
  authorized: boolean;
  loading: boolean;
  isAvailable: boolean;
  onConnect: () => void;
}

function DataRow({
  icon,
  label,
  value,
  unit,
  color = '#111827',
}: {
  icon: string;
  label: string;
  value: string | number | null;
  unit: string;
  color?: string;
}) {
  return (
    <View className="flex-row items-center py-2 border-b border-gray-50">
      <Ionicons name={icon as any} size={18} color="#8CB369" />
      <Text className="text-sm text-gray-600 ml-2 flex-1">{label}</Text>
      {value != null ? (
        <Text className="text-sm font-semibold" style={{ color }}>
          {value} <Text className="text-xs font-normal text-gray-400">{unit}</Text>
        </Text>
      ) : (
        <Text className="text-xs text-gray-300">Sem dados</Text>
      )}
    </View>
  );
}

export function HealthDataCard({
  data,
  authorized,
  loading,
  isAvailable,
  onConnect,
}: HealthDataCardProps) {
  if (!isAvailable) return null;

  if (!authorized) {
    return (
      <Card className="mb-4">
        <View className="flex-row items-center mb-2">
          <Ionicons name="heart-circle-outline" size={20} color="#8CB369" />
          <Text className="text-base font-semibold text-gray-900 ml-2">
            Apple Health
          </Text>
        </View>
        <Text className="text-sm text-gray-500 mb-3 leading-5">
          Liga o Apple Health para ver os teus dados de frequência cardíaca,
          pressão arterial e atividade no Heartline.
        </Text>
        <TouchableOpacity
          onPress={onConnect}
          className="bg-[#8CB369] rounded-xl py-2.5 items-center"
          activeOpacity={0.8}
        >
          <Text className="text-white font-semibold text-sm">
            Ligar Apple Health
          </Text>
        </TouchableOpacity>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="mb-4">
        <View className="flex-row items-center">
          <Ionicons name="heart-circle-outline" size={20} color="#8CB369" />
          <Text className="text-base font-semibold text-gray-900 ml-2">
            Apple Health
          </Text>
        </View>
        <Text className="text-sm text-gray-400 mt-2">A carregar dados...</Text>
      </Card>
    );
  }

  const hasAnyData =
    data.restingHeartRate != null ||
    data.latestHeartRate != null ||
    data.systolic != null ||
    data.avgDailySteps != null;

  return (
    <Card className="mb-4">
      <View className="flex-row items-center mb-1">
        <Ionicons name="heart-circle-outline" size={20} color="#8CB369" />
        <Text className="text-base font-semibold text-gray-900 ml-2">
          Apple Health
        </Text>
      </View>

      {!hasAnyData ? (
        <Text className="text-sm text-gray-400 mt-2">
          Sem dados disponíveis no Apple Health.
        </Text>
      ) : (
        <View className="mt-1">
          <DataRow
            icon="heart-outline"
            label="Freq. cardíaca"
            value={data.latestHeartRate}
            unit="bpm"
          />
          <DataRow
            icon="pulse-outline"
            label="FC em repouso"
            value={data.restingHeartRate}
            unit="bpm"
          />
          {(data.systolic != null || data.diastolic != null) && (
            <DataRow
              icon="fitness-outline"
              label="Pressão arterial"
              value={
                data.systolic != null && data.diastolic != null
                  ? `${data.systolic}/${data.diastolic}`
                  : null
              }
              unit="mmHg"
            />
          )}
          <DataRow
            icon="footsteps-outline"
            label="Passos/dia (média 7d)"
            value={data.avgDailySteps ? data.avgDailySteps.toLocaleString() : null}
            unit=""
          />
          {data.oxygenSaturation != null && (
            <DataRow
              icon="water-outline"
              label="SpO₂"
              value={data.oxygenSaturation}
              unit="%"
            />
          )}
        </View>
      )}
    </Card>
  );
}
