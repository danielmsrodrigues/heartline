import { View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color: string;
}

/** Mini-gráfico de tendência para os cartões de valor. */
export function Sparkline({ data, width = 130, height = 40, color }: SparklineProps) {
  if (data.length < 2) {
    return <View style={{ width, height }} />;
  }

  const padding = 6;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const coords = data.map((value, i) => ({
    x: padding + (i / (data.length - 1)) * chartWidth,
    y: padding + chartHeight - ((value - min) / range) * chartHeight,
  }));
  const last = coords[coords.length - 1];

  return (
    <Svg width={width} height={height}>
      <Polyline points={coords.map((c) => `${c.x},${c.y}`).join(' ')} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={last.x} cy={last.y} r={4.5} fill={color} />
    </Svg>
  );
}
