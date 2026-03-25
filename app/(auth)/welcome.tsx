import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  TouchableOpacity,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface Slide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
}

const slides: Slide[] = [
  {
    id: '1',
    icon: 'documents-outline',
    iconColor: '#1D9E75',
    title: 'Os teus exames, organizados',
    description:
      'Fotografa ou importa os teus exames clínicos. O Heartline extrai os valores automaticamente e organiza tudo num só lugar.',
  },
  {
    id: '2',
    icon: 'analytics-outline',
    iconColor: '#4A90D9',
    title: 'Contexto, não números soltos',
    description:
      'A medicina analisa exames isoladamente. O Heartline cruza os teus dados ao longo do tempo, com o teu histórico familiar e estilo de vida.',
  },
  {
    id: '3',
    icon: 'chatbubbles-outline',
    iconColor: '#EF9F27',
    title: 'Melhores conversas com o teu médico',
    description:
      'Recebe perguntas personalizadas para a tua próxima consulta, baseadas nos teus dados concretos. Informação clara, ação concreta.',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      handleGetStarted();
    }
  };

  const handleGetStarted = async () => {
    await AsyncStorage.setItem('has_seen_welcome', 'true');
    router.replace('/(onboarding)/profile');
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('has_seen_welcome', 'true');
    router.replace('/(onboarding)/profile');
  };

  const isLast = currentIndex === slides.length - 1;

  return (
    <SafeAreaView className="flex-1 bg-[#0A0A0A]">
      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity
          onPress={handleSkip}
          className="absolute top-16 right-6 z-10"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text className="text-sm text-[#555555]">Saltar</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <View style={{ width }} className="flex-1 items-center justify-center px-10">
            <View className="w-28 h-28 rounded-full items-center justify-center mb-8" style={{ backgroundColor: item.iconColor + '20' }}>
              <Ionicons name={item.icon} size={52} color={item.iconColor} />
            </View>
            <Text className="text-2xl font-bold text-[#F5F5F5] text-center mb-4">
              {item.title}
            </Text>
            <Text className="text-base text-[#888888] text-center leading-6">
              {item.description}
            </Text>
          </View>
        )}
      />

      {/* Bottom section */}
      <View className="px-6 pb-4">
        {/* Dots */}
        <View className="flex-row justify-center mb-8">
          {slides.map((_, i) => (
            <View
              key={i}
              className="mx-1 rounded-full"
              style={{
                width: i === currentIndex ? 24 : 8,
                height: 8,
                backgroundColor: i === currentIndex ? '#1D9E75' : '#151515',
              }}
            />
          ))}
        </View>

        {/* Button */}
        <TouchableOpacity
          onPress={handleNext}
          className="bg-[#1D9E75] rounded-xl py-4 items-center"
          activeOpacity={0.8}
        >
          <Text className="text-white font-semibold text-base">
            {isLast ? 'Começar' : 'Seguinte'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
