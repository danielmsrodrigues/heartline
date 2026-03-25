import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TextInput } from 'react-native';
import { Search } from 'lucide-react-native';
import { useProfile } from '@/hooks/useProfile';
import { useBiomarkers } from '@/hooks/useBiomarkers';
import { BiomarkerRow } from '@/components/biomarker-row';
import { Skeleton } from '@/components/ui/Skeleton';

function BiomarkerGridSkeleton() {
  return (
    <View className="flex-row flex-wrap" style={{ marginHorizontal: -6 }}>
      {Array.from({ length: 6 }, (_, i) => (
        <View key={i} style={{ width: '50%', paddingHorizontal: 6, marginBottom: 12 }}>
          <View style={{ backgroundColor: '#111111', borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)' }}>
            <Skeleton width={80} height={15} />
            <Skeleton width={50} height={13} style={{ marginTop: 8 }} />
            <Skeleton width="100%" height={24} style={{ marginTop: 12 }} borderRadius={4} />
            <Skeleton width={70} height={22} borderRadius={11} style={{ marginTop: 10 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function AllBiomarkersScreen() {
  const { familyHistory } = useProfile();
  const { biomarkers, loading } = useBiomarkers(familyHistory.length > 0);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return biomarkers;
    const q = search.toLowerCase().trim();
    return biomarkers.filter(
      (b) => b.name.toLowerCase().includes(q) || b.name_normalized.includes(q)
    );
  }, [biomarkers, search]);

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 }} keyboardShouldPersistTaps="handled">
        {/* Search */}
        <View className="flex-row items-center rounded-xl bg-[#111111] border border-[#151515] px-3 mb-4" style={{ height: 44, gap: 8 }}>
          <Search size={18} color="#555555" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Pesquisar biomarcador..."
            placeholderTextColor="#555555"
            className="flex-1 text-[#F5F5F5] text-base"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        {loading ? (
          <BiomarkerGridSkeleton />
        ) : filtered.length === 0 ? (
          <Text className="text-[#555555] text-center mt-8">Nenhum resultado encontrado</Text>
        ) : (
          <View className="flex-row flex-wrap" style={{ marginHorizontal: -6 }}>
            {filtered.map((b) => (
              <View key={b.name_normalized} style={{ width: '50%', paddingHorizontal: 6, marginBottom: 12 }}>
                <BiomarkerRow biomarker={b} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
