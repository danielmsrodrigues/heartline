import { useState } from 'react';
import { Text, View } from 'react-native';
import { FamilyHistoryEntry } from '@/lib/types';
import { useTheme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { Chip, ChipRow } from '@/components/ui/Chip';
import { Glass, PressableScale } from '@/components/ui/Glass';
import { Icon, IconName } from '@/components/ui/Icon';

export const EVENT_TYPES = [
  'Colesterol elevado', 'Hipertensão', 'Diabetes', 'Enfarte', 'AVC', 'Trombose', 'Arritmia', 'Morte súbita',
];

// Toca-se num de cinco grupos; nos avós e nos tios pergunta-se ainda de que lado.
const RELATIVES: { label: string; value: string; icon: IconName; sided?: boolean }[] = [
  { label: 'Pai', value: 'pai', icon: 'person' },
  { label: 'Mãe', value: 'mãe', icon: 'person' },
  { label: 'Irmãos', value: 'irmãos', icon: 'people' },
  { label: 'Avós', value: 'avós', icon: 'people', sided: true },
  { label: 'Tios', value: 'tios', icon: 'people', sided: true },
];

const SIDES = [
  { label: 'Lado da mãe', value: 'maternos' },
  { label: 'Lado do pai', value: 'paternos' },
] as const;

/** Grupo a que pertence um parentesco guardado (incluindo os antigos, mais detalhados). */
function groupOf(relationship: string): string {
  const r = relationship.toLowerCase();
  if (r.startsWith('av')) return 'avós';
  if (r.startsWith('ti')) return 'tios';
  if (r.startsWith('irm')) return 'irmãos';
  if (r === 'pai') return 'pai';
  if (r === 'mãe' || r === 'mae') return 'mãe';
  return r;
}

/** Lado da família de um parentesco guardado, quando o tem. */
function sideOf(relationship: string): string | null {
  const r = relationship.toLowerCase();
  if (r.includes('matern')) return 'maternos';
  if (r.includes('patern')) return 'paternos';
  return null;
}

/** "AVC · Tios paternos", para listar no perfil. */
export function familyLabel(entry: Pick<FamilyHistoryEntry, 'relationship' | 'event_type'>): string {
  const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
  // O evento é guardado em minúsculas: recupera-se a grafia original ("AVC", não "Avc").
  const event = EVENT_TYPES.find((e) => e.toLowerCase() === entry.event_type.toLowerCase()) ?? cap(entry.event_type);
  const side = sideOf(entry.relationship);
  return `${event} · ${cap(groupOf(entry.relationship))}${side ? ` ${side}` : ''}`;
}

type NewFamilyEntry = Omit<FamilyHistoryEntry, 'id' | 'profile_id' | 'created_at'>;

interface FamilyPickerProps {
  entries: FamilyHistoryEntry[];
  /** Condições abertas pelo utilizador que ainda não têm familiar escolhido. */
  open: string[];
  onOpenChange: (open: string[]) => void;
  onAdd: (entry: NewFamilyEntry) => void;
  onRemove: (id: string) => void;
}

/** Histórico familiar por toques: escolhe-se a condição e depois quem a tem ou teve. */
export function FamilyPicker({ entries, open, onOpenChange, onAdd, onRemove }: FamilyPickerProps) {
  const t = useTheme();
  // Avós/tios tocados à espera de se escolher o lado ("AVC|tios").
  const [pendingSide, setPendingSide] = useState<string[]>([]);

  const sameEvent = (e: FamilyHistoryEntry, event: string) => e.event_type.toLowerCase() === event.toLowerCase();
  const inGroup = (event: string, group: string) => entries.filter((e) => sameEvent(e, event) && groupOf(e.relationship) === group);
  const withEntries = new Set(entries.map((e) => e.event_type.toLowerCase()));
  const isActive = (event: string) => withEntries.has(event.toLowerCase()) || open.includes(event);
  const active = EVENT_TYPES.filter(isActive);

  const toggleEvent = (event: string) => {
    if (isActive(event)) {
      entries.filter((e) => sameEvent(e, event)).forEach((e) => onRemove(e.id));
      onOpenChange(open.filter((o) => o !== event));
      setPendingSide((current) => current.filter((key) => !key.startsWith(`${event}|`)));
    } else {
      onOpenChange([...open, event]);
    }
  };

  const keepOpen = (event: string) => {
    // A condição continua aberta para se poder escolher outro familiar.
    if (!open.includes(event)) onOpenChange([...open, event]);
  };

  const toggleRelative = (event: string, relative: (typeof RELATIVES)[number]) => {
    const key = `${event}|${relative.value}`;
    const matching = inGroup(event, relative.value);
    haptics.select();
    if (matching.length > 0 || pendingSide.includes(key)) {
      matching.forEach((e) => onRemove(e.id));
      setPendingSide((current) => current.filter((k) => k !== key));
      keepOpen(event);
    } else if (relative.sided) {
      setPendingSide((current) => [...current, key]);
    } else {
      onAdd({ relationship: relative.value, event_type: event.toLowerCase(), event_age: null, notes: null });
    }
  };

  const toggleSide = (event: string, group: string, side: string) => {
    const matching = inGroup(event, group).filter((e) => sideOf(e.relationship) === side);
    if (matching.length > 0) {
      matching.forEach((e) => onRemove(e.id));
      // O grupo continua à espera de um lado, em vez de desaparecer.
      setPendingSide((current) => (current.includes(`${event}|${group}`) ? current : [...current, `${event}|${group}`]));
      keepOpen(event);
    } else {
      onAdd({ relationship: `${group} ${side}`, event_type: event.toLowerCase(), event_age: null, notes: null });
    }
  };

  return (
    <View>
      <ChipRow>
        {EVENT_TYPES.map((event) => (
          <Chip key={event} label={event} selected={isActive(event)} choice onPress={() => toggleEvent(event)} />
        ))}
      </ChipRow>

      {active.length > 0 && (
        <Glass style={{ marginTop: 20 }} contentStyle={{ padding: 16 }}>
          {active.map((event, i) => (
            <View key={event}>
              {i > 0 && <View style={{ height: 1, backgroundColor: t.hairline, marginVertical: 14 }} />}
              <Text style={{ fontSize: 15, lineHeight: 20, fontWeight: '600', color: t.ink }}>{event}: quem?</Text>
              <View style={{ flexDirection: 'row', marginTop: 10 }}>
                {RELATIVES.map((relative) => {
                  const on = inGroup(event, relative.value).length > 0 || pendingSide.includes(`${event}|${relative.value}`);
                  return (
                    <PressableScale
                      key={relative.value}
                      onPress={() => toggleRelative(event, relative)}
                      accessibilityLabel={`${event}: ${relative.label}`}
                      accessibilityState={{ selected: on }}
                      style={{ flex: 1, alignItems: 'center', gap: 4 }}
                    >
                      <View style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: on ? t.primaryBg : t.glassBorder, backgroundColor: on ? t.primaryBg : t.chip, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={relative.icon} size={20} color={on ? t.primaryFg : t.ink} />
                      </View>
                      <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: on ? '600' : '500', color: t.ink }}>{relative.label}</Text>
                    </PressableScale>
                  );
                })}
              </View>

              {RELATIVES.filter((r) => r.sided).map((relative) => {
                const members = inGroup(event, relative.value);
                if (members.length === 0 && !pendingSide.includes(`${event}|${relative.value}`)) return null;
                return (
                  <View key={relative.value} style={{ marginTop: 12 }}>
                    <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: '600', color: t.sub }}>{relative.label}: de que lado?</Text>
                    <ChipRow style={{ marginTop: 6 }}>
                      {SIDES.map((side) => (
                        <Chip
                          key={side.value}
                          label={side.label}
                          height={38}
                          choice
                          selected={members.some((e) => sideOf(e.relationship) === side.value)}
                          onPress={() => toggleSide(event, relative.value, side.value)}
                        />
                      ))}
                    </ChipRow>
                  </View>
                );
              })}
            </View>
          ))}
        </Glass>
      )}
    </View>
  );
}
