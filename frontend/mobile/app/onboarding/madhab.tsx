import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useZakatStore } from '../../store/zakatStore';
import { Button } from '../../components/ui';
import { Colors } from '../../constants/colors';
import { Madhab } from '../../engine/zakatEngine';

const MADHABS: {
  key: Madhab;
  name: string;
  note: string;
}[] = [
  {
    key: 'hanafi',
    name: 'Hanafi',
    note: 'All gold and silver jewelry is zakatable, including pieces worn regularly. Hawl is valid if nisab is met at the start and end of the year.',
  },
  {
    key: 'shafii',
    name: "Shafi'i",
    note: 'Worn jewelry for personal adornment is exempt from Zakat. Nisab must be maintained throughout the entire hawl year without dipping below.',
  },
  {
    key: 'maliki',
    name: 'Maliki',
    note: 'Worn jewelry is exempt. Debts only reduce hidden wealth (cash/gold), not visible trade goods or livestock.',
  },
  {
    key: 'hanbali',
    name: 'Hanbali',
    note: 'Worn jewelry is generally exempt. Stricter stance on debt deduction — debts on non-zakatable assets cannot reduce zakat obligation.',
  },
];

export default function MadhabScreen() {
  const setProfile = useZakatStore((s) => s.setProfile);
  const saveProfile = useZakatStore((s) => s.saveProfile);
  const currentMadhab = useZakatStore((s) => s.profile.madhab);
  const [selected, setSelected] = useState<Madhab>(currentMadhab);

  function handleContinue() {
    setProfile({ madhab: selected });
    saveProfile({ madhab: selected }).catch(() => {});
    router.push('/onboarding/nisab');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Step dots */}
      <View style={styles.dots}>
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>

      <Text style={styles.title}>Your madhab</Text>
      <Text style={styles.subtitle}>
        This affects how jewelry and hawl tracking are calculated. You can
        change this later in settings.
      </Text>

      <View style={styles.grid}>
        {MADHABS.map((m) => {
          const isSelected = selected === m.key;
          return (
            <TouchableOpacity
              key={m.key}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => setSelected(m.key)}
              activeOpacity={0.8}
            >
              <View style={styles.cardRow}>
                <View style={[styles.radio, isSelected && styles.radioActive]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.madhabName}>{m.name}</Text>
                  <Text style={styles.madhabNote}>{m.note}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Button label="Continue" onPress={handleContinue} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 28 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.ink10 },
  dotActive: { width: 20, borderRadius: 4, backgroundColor: Colors.green500 },
  title: { fontSize: 24, fontWeight: '600', color: Colors.ink, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.ink60, marginBottom: 24, lineHeight: 20 },
  grid: { gap: 10, marginBottom: 24 },
  card: {
    borderWidth: 0.5, borderColor: Colors.ink10,
    borderRadius: 16, padding: 14,
  },
  cardSelected: {
    borderWidth: 1.5, borderColor: Colors.green500,
    backgroundColor: Colors.green50,
  },
  cardRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1.5, borderColor: Colors.ink20,
    marginTop: 1, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  radioActive: { borderColor: Colors.green500, backgroundColor: Colors.green500 },
  radioInner: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.white },
  madhabName: { fontSize: 14, fontWeight: '600', color: Colors.ink, marginBottom: 4 },
  madhabNote: { fontSize: 12, color: Colors.ink60, lineHeight: 17 },
});
