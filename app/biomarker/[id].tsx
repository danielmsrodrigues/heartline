import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Dimensions, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Line, Circle, Text as SvgText, Polyline, G } from 'react-native-svg';
import { supabase } from '@/lib/supabase';
import { useBiomarkers, BiomarkerWithScoring } from '@/hooks/useBiomarkers';
import { useProfile } from '@/hooks/useProfile';
import { AttentionBadge } from '@/components/attention-badge';
import { Card } from '@/components/ui/Card';
import {
  ATTENTION_COLORS,
  ATTENTION_LABELS,
  TREND_LABELS,
} from '@/constants/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_PADDING = { top: 20, right: 20, bottom: 40, left: 50 };
const CHART_WIDTH = SCREEN_WIDTH - 32 - 8; // screen padding + card padding
const CHART_HEIGHT = 200;
const PLOT_WIDTH = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
const PLOT_HEIGHT = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear().toString().slice(-2);
  return `${day}/${month}/${year}`;
}

function RangeBar({
  value,
  refMin,
  refMax,
  attentionLevel,
}: {
  value: number;
  refMin: number | null;
  refMax: number | null;
  attentionLevel: string;
}) {
  const barWidth = SCREEN_WIDTH - 64;
  const min = refMin ?? 0;
  const max = refMax ?? value * 1.5;
  const range = max - min || 1;

  // Compute visual range with some buffer
  const displayMin = min - range * 0.15;
  const displayMax = max + range * 0.15;
  const displayRange = displayMax - displayMin;

  const rangeStartPct = ((min - displayMin) / displayRange) * 100;
  const rangeWidthPct = ((max - min) / displayRange) * 100;
  const valuePct = Math.max(
    0,
    Math.min(100, ((value - displayMin) / displayRange) * 100)
  );

  const markerColor =
    ATTENTION_COLORS[attentionLevel as keyof typeof ATTENTION_COLORS]?.border ??
    '#8CB369';

  return (
    <View className="mt-3">
      <View style={{ width: barWidth, height: 32 }}>
        {/* Background bar */}
        <View
          className="absolute rounded-full bg-red-100"
          style={{ top: 10, left: 0, right: 0, height: 12 }}
        />
        {/* Range bar (green) */}
        <View
          className="absolute rounded-full bg-green-200"
          style={{
            top: 10,
            left: `${rangeStartPct}%`,
            width: `${rangeWidthPct}%`,
            height: 12,
          }}
        />
        {/* Value marker */}
        <View
          style={{
            position: 'absolute',
            left: `${valuePct}%`,
            top: 2,
            marginLeft: -8,
          }}
        >
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: 8,
              borderRightWidth: 8,
              borderTopWidth: 10,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: markerColor,
            }}
          />
          <View
            style={{
              width: 3,
              height: 16,
              backgroundColor: markerColor,
              marginLeft: 5.5,
            }}
          />
        </View>
      </View>
      {/* Labels */}
      <View className="flex-row justify-between mt-1">
        <Text className="text-xs text-gray-400">
          {refMin != null ? refMin : '—'}
        </Text>
        <Text className="text-xs text-gray-400">
          {refMax != null ? refMax : '—'}
        </Text>
      </View>
    </View>
  );
}

function EvolutionChart({
  readings,
  refMin,
  refMax,
  unit,
  color,
}: {
  readings: { value: number; date: string }[];
  refMin: number | null;
  refMax: number | null;
  unit: string;
  color: string;
}) {
  if (readings.length === 0) return null;

  const values = readings.map((r) => r.value);
  const allValues = [
    ...values,
    ...(refMin != null ? [refMin] : []),
    ...(refMax != null ? [refMax] : []),
  ];
  const dataMin = Math.min(...allValues) * 0.9;
  const dataMax = Math.max(...allValues) * 1.1;
  const dataRange = dataMax - dataMin || 1;

  const toY = (val: number) =>
    CHART_PADDING.top +
    PLOT_HEIGHT -
    ((val - dataMin) / dataRange) * PLOT_HEIGHT;

  const toX = (index: number) =>
    CHART_PADDING.left +
    (readings.length === 1
      ? PLOT_WIDTH / 2
      : (index / (readings.length - 1)) * PLOT_WIDTH);

  // Reference range shading
  const refMinY = refMin != null ? toY(refMin) : null;
  const refMaxY = refMax != null ? toY(refMax) : null;

  // Points for polyline
  const polylinePoints = readings
    .map((_, i) => `${toX(i)},${toY(readings[i].value)}`)
    .join(' ');

  // Y-axis ticks (3-5 values)
  const yTickCount = 4;
  const yTicks = Array.from({ length: yTickCount }, (_, i) => {
    const val = dataMin + (dataRange * i) / (yTickCount - 1);
    return { value: Math.round(val * 10) / 10, y: toY(val) };
  });

  return (
    <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
      {/* Reference range shading */}
      {refMinY != null && refMaxY != null && (
        <Rect
          x={CHART_PADDING.left}
          y={refMaxY}
          width={PLOT_WIDTH}
          height={refMinY - refMaxY}
          fill="#8CB369"
          opacity={0.1}
        />
      )}

      {/* Reference lines */}
      {refMinY != null && (
        <Line
          x1={CHART_PADDING.left}
          y1={refMinY}
          x2={CHART_PADDING.left + PLOT_WIDTH}
          y2={refMinY}
          stroke="#8CB369"
          strokeWidth={1}
          strokeDasharray="4,4"
          opacity={0.5}
        />
      )}
      {refMaxY != null && (
        <Line
          x1={CHART_PADDING.left}
          y1={refMaxY}
          x2={CHART_PADDING.left + PLOT_WIDTH}
          y2={refMaxY}
          stroke="#8CB369"
          strokeWidth={1}
          strokeDasharray="4,4"
          opacity={0.5}
        />
      )}

      {/* Y-axis ticks */}
      {yTicks.map((tick, i) => (
        <G key={i}>
          <Line
            x1={CHART_PADDING.left}
            y1={tick.y}
            x2={CHART_PADDING.left + PLOT_WIDTH}
            y2={tick.y}
            stroke="#E5E7EB"
            strokeWidth={0.5}
          />
          <SvgText
            x={CHART_PADDING.left - 8}
            y={tick.y + 4}
            textAnchor="end"
            fill="#9CA3AF"
            fontSize={10}
          >
            {tick.value}
          </SvgText>
        </G>
      ))}

      {/* Data line */}
      {readings.length > 1 && (
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Data points + date labels */}
      {readings.map((r, i) => (
        <G key={i}>
          <Circle cx={toX(i)} cy={toY(r.value)} r={4} fill={color} />
          <Circle cx={toX(i)} cy={toY(r.value)} r={2} fill="white" />
          <SvgText
            x={toX(i)}
            y={CHART_HEIGHT - 5}
            textAnchor="middle"
            fill="#9CA3AF"
            fontSize={9}
          >
            {formatDate(r.date)}
          </SvgText>
        </G>
      ))}
    </Svg>
  );
}

export default function BiomarkerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { familyHistory } = useProfile();
  const { biomarkers, refetch: refetchBio } = useBiomarkers(familyHistory.length > 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleDeleteReading = (readingId: string, date: string) => {
    Alert.alert(
      'Apagar valor',
      `Apagar o registo de ${formatDate(date)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('biomarkers').delete().eq('id', readingId);
            refetchBio();
          },
        },
      ]
    );
  };

  const handleStartEdit = (readingId: string, currentValue: number) => {
    setEditingId(readingId);
    setEditValue(currentValue.toString());
  };

  const handleSaveEdit = async (readingId: string) => {
    const newValue = parseFloat(editValue);
    if (isNaN(newValue)) {
      Alert.alert('Valor inválido', 'Introduz um número válido.');
      return;
    }
    await supabase.from('biomarkers').update({ value: newValue }).eq('id', readingId);
    setEditingId(null);
    refetchBio();
  };

  const biomarker = useMemo(
    () => biomarkers.find((b) => b.name_normalized === id),
    [biomarkers, id]
  );

  const cardiovascularMarkers = [
    'ldl',
    'hdl',
    'total_cholesterol',
    'triglycerides',
    'glucose',
    'hba1c',
    'crp',
  ];

  const color = biomarker
    ? ATTENTION_COLORS[biomarker.attentionLevel].border
    : '#8CB369';
  const trendLabel = biomarker ? TREND_LABELS[biomarker.trend] : '';
  const hasFamilyHistory = familyHistory.length > 0;
  const isFamilyRelevant = biomarker
    ? hasFamilyHistory &&
      cardiovascularMarkers.includes(biomarker.name_normalized)
    : false;

  const suggestedQuestion = useMemo(() => {
    if (!biomarker) return null;
    const name = biomarker.name;
    const val = biomarker.latestValue;
    const unit = biomarker.unit;

    if (biomarker.attentionLevel === 'fora_do_range') {
      return `O meu valor de ${name} está em ${val} ${unit}, fora do range de referência indicado pelo laboratório. Que avaliação faz deste resultado no meu contexto?`;
    }
    if (biomarker.attentionLevel === 'merece_atencao') {
      return `O meu ${name} está em ${val} ${unit} e a tendência parece ser de subida. Faz sentido acompanhar este valor mais de perto?`;
    }
    if (biomarker.trend === 'a_subir') {
      return `Tenho notado que o meu ${name} tem vindo a subir (atualmente ${val} ${unit}). Seria útil explorar o que pode estar a influenciar esta tendência?`;
    }
    return null;
  }, [biomarker]);

  if (!biomarker) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute top-16 left-6"
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Ionicons name="flask-outline" size={48} color="#D1D5DB" />
          <Text className="text-base text-gray-500 mt-3">
            Biomarcador não encontrado
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-4 pt-4">
          {/* Header */}
          <View className="flex-row items-center mb-4">
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-900 ml-3 flex-1">
              {biomarker.name}
            </Text>
            <AttentionBadge level={biomarker.attentionLevel} />
          </View>

          {/* Latest value */}
          <Card className="mb-4">
            <Text className="text-sm text-gray-500">Último valor</Text>
            <View className="flex-row items-baseline mt-1">
              <Text className="text-3xl font-bold" style={{ color }}>
                {biomarker.latestValue}
              </Text>
              <Text className="text-base text-gray-500 ml-2">
                {biomarker.unit}
              </Text>
            </View>

            {/* Trend */}
            <View className="flex-row items-center mt-2">
              <Ionicons
                name={
                  biomarker.trend === 'a_subir'
                    ? 'trending-up'
                    : biomarker.trend === 'a_descer'
                    ? 'trending-down'
                    : 'remove-outline'
                }
                size={16}
                color={
                  biomarker.trend === 'a_subir'
                    ? '#E07A5F'
                    : biomarker.trend === 'a_descer'
                    ? '#8CB369'
                    : '#9CA3AF'
                }
              />
              <Text className="text-sm text-gray-600 ml-1.5">
                {trendLabel}
              </Text>
            </View>

            {/* Range bar */}
            <Text className="text-sm font-medium text-gray-700 mt-4">
              Posição no range de referência
            </Text>
            <RangeBar
              value={biomarker.latestValue}
              refMin={biomarker.ref_min}
              refMax={biomarker.ref_max}
              attentionLevel={biomarker.attentionLevel}
            />
          </Card>

          {/* Evolution chart */}
          <Card className="mb-4">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              Evolução temporal
            </Text>
            {biomarker.readings.length >= 2 ? (
              <EvolutionChart
                readings={biomarker.readings}
                refMin={biomarker.ref_min}
                refMax={biomarker.ref_max}
                unit={biomarker.unit}
                color={color}
              />
            ) : (
              <View className="items-center py-6">
                <Ionicons name="analytics-outline" size={32} color="#D1D5DB" />
                <Text className="text-sm text-gray-400 mt-2 text-center">
                  São necessários pelo menos 2 registos para ver a evolução.
                </Text>
              </View>
            )}
          </Card>

          {/* Readings history */}
          <Card className="mb-4">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              Histórico de valores
            </Text>
            {/* Table header */}
            <View className="flex-row pb-2 mb-2 border-b border-gray-100">
              <Text className="text-xs font-medium text-gray-500 flex-1">Data</Text>
              <Text className="text-xs font-medium text-gray-500 w-24 text-right">Valor</Text>
              <Text className="text-xs font-medium text-gray-500 w-16 text-right"></Text>
            </View>
            {[...biomarker.readings].reverse().map((r) => {
              const isOutOfRange =
                (biomarker.ref_min != null && r.value < biomarker.ref_min) ||
                (biomarker.ref_max != null && r.value > biomarker.ref_max);
              const isEditing = editingId === r.id;
              return (
                <View key={r.id} className="flex-row items-center py-2 border-b border-gray-50">
                  <Text className="text-sm text-gray-600 flex-1">
                    {formatDate(r.date)}
                  </Text>
                  {isEditing ? (
                    <View className="flex-row items-center">
                      <TextInput
                        value={editValue}
                        onChangeText={setEditValue}
                        keyboardType="decimal-pad"
                        autoFocus
                        className="text-sm font-medium text-gray-900 border border-gray-300 rounded-lg px-2 py-1 w-20 text-right mr-1"
                      />
                      <TouchableOpacity
                        onPress={() => handleSaveEdit(r.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="checkmark-circle" size={22} color="#8CB369" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setEditingId(null)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        className="ml-1"
                      >
                        <Ionicons name="close-circle" size={22} color="#9CA3AF" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <Text
                        className={`text-sm font-medium w-24 text-right ${
                          isOutOfRange ? 'text-red-500' : 'text-gray-900'
                        }`}
                      >
                        {r.value} {biomarker.unit}
                      </Text>
                      <View className="flex-row w-16 justify-end">
                        <TouchableOpacity
                          onPress={() => handleStartEdit(r.id, r.value)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="pencil-outline" size={16} color="#9CA3AF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteReading(r.id, r.date)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          className="ml-2"
                        >
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              );
            })}
          </Card>

          {/* Family history note */}
          {isFamilyRelevant && (
            <Card className="mb-4">
              <View className="flex-row items-start">
                <Ionicons
                  name="people-outline"
                  size={18}
                  color="#B8860B"
                  style={{ marginTop: 1 }}
                />
                <View className="flex-1 ml-2">
                  <Text className="text-sm font-semibold text-amber-800">
                    Contexto familiar
                  </Text>
                  <Text className="text-sm text-gray-700 mt-1 leading-5">
                    Tendo em conta o teu histórico familiar cardiovascular, faz
                    sentido acompanhar este biomarcador com atenção extra. Partilha
                    esta informação com o teu médico para que possa avaliar no teu
                    contexto pessoal.
                  </Text>
                </View>
              </View>
            </Card>
          )}

          {/* Suggested question */}
          {suggestedQuestion && (
            <Card className="mb-4">
              <View className="flex-row items-start">
                <Ionicons
                  name="chatbubble-outline"
                  size={16}
                  color="#8CB369"
                  style={{ marginTop: 2 }}
                />
                <View className="flex-1 ml-2">
                  <Text className="text-sm font-semibold text-gray-900">
                    Sugestão para a consulta
                  </Text>
                  <Text className="text-sm text-gray-700 mt-1 leading-5">
                    "{suggestedQuestion}"
                  </Text>
                </View>
              </View>
            </Card>
          )}

          {/* Disclaimer */}
          <View className="flex-row items-start bg-blue-50 rounded-xl p-3 border border-blue-100">
            <Ionicons
              name="information-circle"
              size={16}
              color="#3B82F6"
              style={{ marginTop: 1 }}
            />
            <Text className="text-xs text-blue-700 ml-2 flex-1 leading-4">
              Esta análise baseia-se apenas nos dados que nos forneceste. O teu
              médico tem acesso ao teu contexto clínico completo.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
