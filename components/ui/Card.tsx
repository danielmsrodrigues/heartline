import { View } from 'react-native';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <View className={`bg-[#111111] rounded-2xl p-4 border border-[#151515] ${className}`}>
      {children}
    </View>
  );
}
