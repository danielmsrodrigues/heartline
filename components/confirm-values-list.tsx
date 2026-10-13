import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { ExtractedMarker } from '@/lib/types';
import { formatValue, parseDecimal } from '@/lib/number';
import { useTheme } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { ListCard } from '@/components/ui/List';

/** Marcador em edição: a key mantém-se estável quando se removem outros. */
export type EditableMarker = ExtractedMarker & { key: string };

interface ConfirmValuesListProps {
  markers: EditableMarker[];
  onUpdate: (key: string, field: keyof ExtractedMarker, value: string | number | null) => void;
  onRemove: (key: string) => void;
}

function MarkerRow({ marker, onUpdate, onRemove }: {
  marker: EditableMarker;
  onUpdate: ConfirmValuesListProps['onUpdate'];
  onRemove: ConfirmValuesListProps['onRemove'];
}) {
  const t = useTheme();
  // Um valor acrescentado sem nome abre logo os detalhes para o escrever.
  const [expanded, setExpanded] = useState(!marker.name);
  // O texto vive aqui para se poder escrever "0," a meio; o pai só vê números.
  const [valueText, setValueText] = useState(Number.isFinite(marker.value) ? formatValue(marker.value) : '');
  const [refMinText, setRefMinText] = useState(marker.ref_min != null ? formatValue(marker.ref_min) : '');
  const [refMaxText, setRefMaxText] = useState(marker.ref_max != null ? formatValue(marker.ref_max) : '');

  // A IA não ficou segura deste valor: destaca-se para o utilizador o comparar com o papel.
  const needsCheck = marker.confidence === 'low' || marker.confidence === 'medium';
  const valueInvalid = valueText.trim() !== '' && !Number.isFinite(marker.value);
  const refText = marker.ref_min != null && marker.ref_max != null
    ? `${formatValue(marker.ref_min)} a ${formatValue(marker.ref_max)}`
    : marker.ref_max != null
      ? `até ${formatValue(marker.ref_max)}`
      : marker.ref_min != null
        ? `a partir de ${formatValue(marker.ref_min)}`
        : null;

  const handleValueChange = (text: string) => {
    setValueText(text);
    onUpdate(marker.key, 'value', parseDecimal(text) ?? NaN);
  };
  const handleRefChange = (field: 'ref_min' | 'ref_max', text: string) => {
    (field === 'ref_min' ? setRefMinText : setRefMaxText)(text);
    onUpdate(marker.key, field, parseDecimal(text));
  };

  const small = { height: 44, borderRadius: 14, backgroundColor: t.selected, paddingHorizontal: 12, fontSize: 16, color: t.ink } as const;
  const label = { fontSize: 13, lineHeight: 18, fontWeight: '600', color: t.sub, marginBottom: 4 } as const;

  return (
    <View style={{ paddingLeft: 18, paddingRight: 14, paddingVertical: 9 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 42 }}>
        <Pressable
          onPress={() => setExpanded((e) => !e)}
          accessibilityRole="button"
          accessibilityLabel={`${marker.name || 'Valor sem nome'}. ${expanded ? 'Fechar' : 'Editar'} detalhes`}
          style={{ flex: 1 }}
        >
          <Text numberOfLines={1} style={{ fontSize: 16, lineHeight: 21, color: marker.name ? t.ink : t.sub }}>{marker.name || 'Novo valor'}</Text>
          {refText ? <Text numberOfLines={1} style={{ fontSize: 13, lineHeight: 18, color: t.sub }}>Ref. {refText}</Text> : null}
        </Pressable>
        {needsCheck ? (
          <View accessible accessibilityRole="image" accessibilityLabel="Confirma este valor" style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.dot.watch }} />
        ) : null}
        <TextInput
          value={valueText}
          onChangeText={handleValueChange}
          keyboardType="decimal-pad"
          placeholder="—"
          placeholderTextColor={t.sub}
          selectTextOnFocus
          accessibilityLabel={`Valor de ${marker.name}`}
          selectionColor={t.link}
          style={{
            minWidth: 76, height: 40, borderRadius: 14, paddingHorizontal: 12, textAlign: 'right',
            fontSize: 17, fontWeight: '600', color: t.ink, backgroundColor: t.selected,
            borderWidth: 1.5, borderColor: valueInvalid ? t.dot.out : needsCheck ? t.dot.watch : 'transparent',
          }}
        />
        <Text numberOfLines={1} style={{ width: 46, fontSize: 13, color: t.sub }}>{marker.unit}</Text>
      </View>

      {expanded && (
        <View style={{ marginTop: 10, marginBottom: 4, gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 2 }}>
              <Text style={label}>Nome</Text>
              <TextInput value={marker.name} onChangeText={(text) => onUpdate(marker.key, 'name', text)} accessibilityLabel="Nome do valor" placeholder="Ex.: Ferritina" placeholderTextColor={t.sub} selectionColor={t.link} style={small} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={label}>Unidade</Text>
              <TextInput value={marker.unit} onChangeText={(text) => onUpdate(marker.key, 'unit', text)} accessibilityLabel="Unidade" autoCapitalize="none" placeholder="mg/dL" placeholderTextColor={t.sub} selectionColor={t.link} style={small} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Text style={label}>Referência mín.</Text>
              <TextInput value={refMinText} onChangeText={(text) => handleRefChange('ref_min', text)} keyboardType="decimal-pad" accessibilityLabel="Mínimo de referência" placeholder="—" placeholderTextColor={t.sub} selectionColor={t.link} style={small} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={label}>Referência máx.</Text>
              <TextInput value={refMaxText} onChangeText={(text) => handleRefChange('ref_max', text)} keyboardType="decimal-pad" accessibilityLabel="Máximo de referência" placeholder="—" placeholderTextColor={t.sub} selectionColor={t.link} style={small} />
            </View>
            <Button variant="danger" title="Remover" onPress={() => onRemove(marker.key)} style={{ height: 44, paddingHorizontal: 8 }} />
          </View>
        </View>
      )}
    </View>
  );
}

/** Valores de um exame, editáveis antes de guardar. Tocar no nome abre os detalhes. */
export function ConfirmValuesList({ markers, onUpdate, onRemove }: ConfirmValuesListProps) {
  if (markers.length === 0) return null;
  return (
    <ListCard>
      {markers.map((marker) => (
        <MarkerRow key={marker.key} marker={marker} onUpdate={onUpdate} onRemove={onRemove} />
      ))}
    </ListCard>
  );
}
