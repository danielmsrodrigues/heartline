import { View } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({ data, width = 80, height = 30, color = '#1D9E75' }: SparklineProps) {
  if (data.length < 2) {
    return (
      <View style={{ width, height }} className="items-center justify-center">
        <View className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      </View>
    );
  }

  const padding = 4;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((value - min) / range) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const lastX = padding + ((data.length - 1) / (data.length - 1)) * chartWidth;
  const lastY = padding + chartHeight - ((data[data.length - 1] - min) / range) * chartHeight;

  return (
    <Svg width={width} height={height}>
      <Polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={lastX} cy={lastY} r={2.5} fill={color} />
    </Svg>
  );
}
