import { useEffect, useRef } from 'react';
import { Animated, Easing, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width, height = 14, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#1A1A1A',
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Card-shaped skeleton with icon circle + text lines */
export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <Animated.View
      style={{
        backgroundColor: '#111111',
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        gap: 14,
        alignItems: 'flex-start',
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <Skeleton width={32} height={32} borderRadius={16} />
      <Animated.View style={{ flex: 1, gap: 8 }}>
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton
            key={i}
            width={i === 0 ? '85%' : `${55 + Math.random() * 25}%`}
            height={14}
          />
        ))}
      </Animated.View>
    </Animated.View>
  );
}

/** Biomarker card-shaped skeleton (for grid/horizontal scroll) */
export function SkeletonBiomarkerCard() {
  return (
    <Animated.View
      style={{
        backgroundColor: '#111111',
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.06)',
        borderRadius: 16,
        padding: 16,
        minWidth: 150,
        minHeight: 110,
        justifyContent: 'space-between',
      }}
    >
      <Animated.View>
        <Skeleton width={80} height={16} />
        <Skeleton width={50} height={13} style={{ marginTop: 8 }} />
      </Animated.View>
      <Skeleton width={100} height={24} style={{ marginTop: 10 }} borderRadius={4} />
    </Animated.View>
  );
}

/** Section skeleton with title + paragraph lines */
export function SkeletonSection({ titleWidth = 160 }: { titleWidth?: number }) {
  return (
    <Animated.View style={{ marginBottom: 32 }}>
      <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Skeleton width={36} height={36} borderRadius={18} />
        <Skeleton width={titleWidth} height={18} />
      </Animated.View>
      <Animated.View style={{ gap: 8 }}>
        <Skeleton width="95%" height={14} />
        <Skeleton width="80%" height={14} />
        <Skeleton width="65%" height={14} />
      </Animated.View>
    </Animated.View>
  );
}

/** Full-width detail card skeleton */
export function SkeletonDetailCard() {
  return (
    <Animated.View
      style={{
        backgroundColor: '#111111',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#151515',
        marginBottom: 20,
      }}
    >
      <Animated.View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Animated.View>
          <Skeleton width={100} height={12} style={{ marginBottom: 8 }} />
          <Skeleton width={120} height={40} />
        </Animated.View>
        <Skeleton width={90} height={28} borderRadius={14} />
      </Animated.View>
      <Skeleton width="100%" height={12} borderRadius={6} style={{ marginTop: 20 }} />
      <Animated.View style={{ flexDirection: 'row', marginTop: 16, gap: 12 }}>
        <Skeleton width={60} height={16} />
        <Skeleton width={8} height={8} borderRadius={4} />
        <Skeleton width={50} height={16} />
      </Animated.View>
    </Animated.View>
  );
}

/** Settings row skeleton */
export function SkeletonSettingsRow({ isLast = false }: { isLast?: boolean }) {
  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: '#151515',
      }}
    >
      <Skeleton width={120 + Math.random() * 60} height={16} />
      <Skeleton width={60} height={16} />
    </Animated.View>
  );
}
