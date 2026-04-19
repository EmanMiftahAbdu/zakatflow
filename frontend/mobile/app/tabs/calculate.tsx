import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, Alert,
} from 'react-native';
import { useZakatStore } from '../../store/zakatStore';
import { Button, Card, SectionLabel } from '../../components/ui';
import { Colors } from '../../constants/colors';
import { Liability } from '../../engine/zakatEngine';
import * as Crypto from 'expo-crypto';
import { saveCalculation } from '../../lib/api';

const ASSET_DOT_COLORS: Record<string, string> = {
  cash:       Colors.green400,
  gold:       Colors.gold500,
  stock:      Colors.green300,
  crypto:     '#8B7CC8',
  retirement: Colors.green600,
};

export default function CalculateScreen() {
  const { liabilities, addLiability, removeLiability, persistLiability, deleteLiabilityRemote } = useZakatStore();
  const zakatResult = useZakatStore((s) => s.getZakatResult());
  const profile = useZakatStore((s) => s.profile);

  const [showLiabilityModal, setShowLiabilityModal] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSaveCalculation() {
    setSaving(true);
    try {
      await saveCalculation();
      Alert.alert('Saved', 'Calculation saved to your history.');
    } catch {
      Alert.alert('Error', 'Could not save. Make sure your assets are synced and try again.');
    } finally {
      setSaving(false);
    }
  }
  const [liabLabel, setLiabLabel] = useState('');
  const [liabAmount, setLiabAmount] = useState('');
  const [liabType, setLiabType] = useState<Liability['type']>('shortterm');
  const [liabMonthly, setLiabMonthly] = useState('');

  async function addLiabilityEntry() {
    if (!liabAmount) return;
    const id = await Crypto.randomUUID();
    const liability = {
      id,
      label: liabLabel || 'Liability',
      type: liabType,
      totalBalance: parseFloat(liabAmount),
      monthlyPrincipal: liabType === 'longterm' && liabMonthly
        ? parseFloat(liabMonthly)
        : undefined,
    };
    addLiability(liability);
    setShowLiabilityModal(false);
    setLiabLabel(''); setLiabAmount(''); setLiabMonthly(''); setLiabType('shortterm');
    try { await persistLiability(liability); } catch {}
  }

  const { breakdown, zakatDue, netZakatableWealth, totalDeductions,
          totalRibaExcluded, nisabThreshold, meetsNisab, hawlComplete } = zakatResult;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Calculation</Text>
      <Text style={styles.pageSub}>
        {profile.madhab.charAt(0).toUpperCase() + profile.madhab.slice(1)} · {' '}
        {profile.nisabStandard === 'silver' ? 'Silver' : 'Gold'} nisab
      </Text>

      {/* Formula steps */}
      <View style={styles.formulaCard}>
        <FormulaRow
          label="Total assets"
          value={`$${zakatResult.totalRawAssets.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          color={Colors.green400}
        />
        {totalRibaExcluded > 0 && (
          <FormulaRow
            label="Riba excluded"
            value={`−$${totalRibaExcluded.toFixed(2)}`}
            color={Colors.red600}
            note="Must be purified"
          />
        )}
        {totalDeductions > 0 && (
          <FormulaRow
            label="Liabilities deducted"
            value={`−$${totalDeductions.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            color={Colors.red600}
          />
        )}
        <View style={styles.formulaDivider} />
        <FormulaRow
          label="Net zakatable wealth"
          value={`$${netZakatableWealth.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          color={Colors.green700}
          bold
        />
        <View style={styles.formulaDivider} />
        <View style={styles.nisabRow}>
          <Text style={styles.nisabLabel}>Nisab threshold</Text>
          <View style={styles.nisabRight}>
            <Text style={styles.nisabValue}>${nisabThreshold.toFixed(0)}</Text>
            <View style={[styles.nisabPill, { backgroundColor: meetsNisab ? Colors.green50 : Colors.red50 }]}>
              <Text style={[styles.nisabPillText, { color: meetsNisab ? Colors.green600 : Colors.red600 }]}>
                {meetsNisab ? '✓ Met' : '✗ Not met'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.nisabRow}>
          <Text style={styles.nisabLabel}>Hawl complete</Text>
          <View style={[styles.nisabPill, { backgroundColor: hawlComplete ? Colors.green50 : Colors.gold100 }]}>
            <Text style={[styles.nisabPillText, { color: hawlComplete ? Colors.green600 : Colors.gold700 }]}>
              {hawlComplete ? '✓ Yes' : '⏳ Pending'}
            </Text>
          </View>
        </View>
      </View>

      {/* Final due */}
      <View style={styles.dueCard}>
        <Text style={styles.dueLabel}>ZAKAT DUE @ 2.5%</Text>
        <Text style={styles.dueAmount}>${zakatDue.toFixed(2)}</Text>
        {!meetsNisab && (
          <Text style={styles.dueNote}>Below nisab threshold — no Zakat due</Text>
        )}
        {!hawlComplete && meetsNisab && (
          <Text style={styles.dueNote}>Hawl year not yet complete</Text>
        )}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSaveCalculation}
          activeOpacity={0.8}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save to history'}</Text>
        </TouchableOpacity>
      </View>

      {/* Asset breakdown */}
      <SectionLabel label="Asset breakdown" />
      <View style={styles.breakdownCard}>
        <View style={styles.breakdownHeader}>
          <Text style={styles.breakdownHeaderText}>Asset</Text>
          <Text style={styles.breakdownHeaderText}>Zakatable</Text>
          <Text style={styles.breakdownHeaderText}>Due</Text>
        </View>
        {breakdown.map((item) => (
          <View key={item.id} style={styles.breakdownRow}>
            <View style={[styles.breakdownDot, { backgroundColor: ASSET_DOT_COLORS[item.id.startsWith('plaid') ? 'cash' : 'cash'] ?? Colors.green400 }]} />
            <Text style={styles.breakdownName} numberOfLines={1}>{item.label}</Text>
            <Text style={styles.breakdownBase}>${item.zakatableValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
            <Text style={styles.breakdownZakat}>${item.zakatDue.toFixed(2)}</Text>
          </View>
        ))}
        <View style={[styles.breakdownRow, styles.breakdownTotal]}>
          <View style={[styles.breakdownDot, { backgroundColor: Colors.ink }]} />
          <Text style={[styles.breakdownName, { fontWeight: '600' }]}>Total</Text>
          <Text style={[styles.breakdownBase, { fontWeight: '600', color: Colors.ink }]}>
            ${netZakatableWealth.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </Text>
          <Text style={[styles.breakdownZakat, { color: Colors.ink, fontSize: 14 }]}>
            ${zakatDue.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Liabilities */}
      <SectionLabel label="Liabilities" />
      {liabilities.length > 0 && (
        <View style={styles.liabilityCard}>
          {liabilities.map((l, i) => {
            const deductible =
              l.type === 'interest' ? 0
              : l.type === 'shortterm' ? l.totalBalance
              : Math.min((l.monthlyPrincipal ?? 0) * 12, l.totalBalance);
            const isBlocked = l.type === 'interest';
            return (
              <View
                key={l.id}
                style={[styles.liabRow, i < liabilities.length - 1 && styles.liabRowBorder]}
              >
                <View style={[styles.liabIndicator, {
                  backgroundColor:
                    isBlocked ? Colors.red600
                    : l.type === 'longterm' ? Colors.gold500
                    : Colors.green500,
                }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.liabName}>{l.label}</Text>
                  <Text style={styles.liabRule}>
                    {isBlocked ? 'Riba — not deductible'
                    : l.type === 'shortterm' ? 'Fully deductible'
                    : `12-month principal: $${deductible.toLocaleString()}`}
                  </Text>
                </View>
                <Text style={[styles.liabAmt, isBlocked && styles.liabStruck]}>
                  −${deductible.toLocaleString()}
                </Text>
                <TouchableOpacity onPress={() => deleteLiabilityRemote(l.id).catch(() => removeLiability(l.id))} style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>×</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      <TouchableOpacity style={styles.addBtn} onPress={() => setShowLiabilityModal(true)}>
        <Text style={styles.addBtnText}>+ Add liability</Text>
      </TouchableOpacity>

      {/* Liability modal */}
      <Modal visible={showLiabilityModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add liability</Text>

            <Text style={styles.fieldLabel}>Label</Text>
            <TextInput style={styles.input} value={liabLabel} onChangeText={setLiabLabel} placeholder="e.g. Credit card" placeholderTextColor={Colors.ink20} />

            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.typeRow}>
              {(['shortterm', 'longterm', 'interest'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeOpt, liabType === t && styles.typeOptActive]}
                  onPress={() => setLiabType(t)}
                >
                  <Text style={[styles.typeText, liabType === t && { color: Colors.green700 }]}>
                    {t === 'shortterm' ? 'Short-term' : t === 'longterm' ? 'Long-term' : 'Interest'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.infoBox, { marginBottom: 14 }]}>
              <Text style={styles.infoText}>
                {liabType === 'shortterm'
                  ? 'Fully deductible — credit cards, medical bills, overdue rent.'
                  : liabType === 'longterm'
                  ? 'Only 12 months of principal payments deductible — mortgages, student loans.'
                  : 'Interest (riba) is never deductible from zakatable wealth.'}
              </Text>
            </View>

            <Text style={styles.fieldLabel}>Total balance ($)</Text>
            <TextInput style={styles.input} value={liabAmount} onChangeText={setLiabAmount} placeholder="0.00" keyboardType="decimal-pad" placeholderTextColor={Colors.ink20} />

            {liabType === 'longterm' && (
              <>
                <Text style={styles.fieldLabel}>Monthly principal payment ($)</Text>
                <TextInput style={styles.input} value={liabMonthly} onChangeText={setLiabMonthly} placeholder="0.00" keyboardType="decimal-pad" placeholderTextColor={Colors.ink20} />
              </>
            )}

            <View style={{ gap: 8, marginTop: 4 }}>
              <Button label="Add liability" onPress={addLiabilityEntry} disabled={liabType === 'interest'} />
              <Button label="Cancel" onPress={() => setShowLiabilityModal(false)} variant="outline" />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function FormulaRow({ label, value, color, note, bold }: {
  label: string; value: string; color: string; note?: string; bold?: boolean;
}) {
  return (
    <View style={formulaStyles.row}>
      <View>
        <Text style={[formulaStyles.label, bold && { fontWeight: '600', color: Colors.ink }]}>{label}</Text>
        {note && <Text style={formulaStyles.note}>{note}</Text>}
      </View>
      <Text style={[formulaStyles.value, { color }, bold && { fontSize: 17 }]}>{value}</Text>
    </View>
  );
}

const formulaStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  label: { fontSize: 13, color: Colors.ink60 },
  note: { fontSize: 11, color: Colors.ink40, marginTop: 1 },
  value: { fontSize: 14, fontWeight: '500' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.ink05 },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  pageTitle: { fontSize: 24, fontWeight: '600', color: Colors.ink, marginBottom: 4 },
  pageSub: { fontSize: 13, color: Colors.ink40, marginBottom: 20 },

  formulaCard: { backgroundColor: Colors.white, borderRadius: 16, borderWidth: 0.5, borderColor: Colors.ink10, padding: 16, marginBottom: 12 },
  formulaDivider: { height: 0.5, backgroundColor: Colors.ink10, marginVertical: 8 },
  nisabRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  nisabRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nisabLabel: { fontSize: 13, color: Colors.ink60 },
  nisabValue: { fontSize: 13, fontWeight: '500', color: Colors.ink },
  nisabPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  nisabPillText: { fontSize: 11, fontWeight: '600' },

  dueCard: { backgroundColor: Colors.green800, borderRadius: 16, padding: 20, marginBottom: 12, alignItems: 'center' },
  dueLabel: { fontSize: 10, color: Colors.green200, letterSpacing: 1, fontWeight: '600', marginBottom: 4 },
  dueAmount: { fontSize: 42, fontWeight: '600', color: Colors.white },
  dueNote: { fontSize: 12, color: Colors.green300, marginTop: 4 },
  saveBtn: { marginTop: 14, paddingHorizontal: 20, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10 },
  saveBtnText: { fontSize: 13, fontWeight: '600', color: Colors.white },

  breakdownCard: { backgroundColor: Colors.white, borderRadius: 16, borderWidth: 0.5, borderColor: Colors.ink10, overflow: 'hidden', marginBottom: 4 },
  breakdownHeader: { flexDirection: 'row', backgroundColor: Colors.ink05, padding: 10 },
  breakdownHeaderText: { flex: 1, fontSize: 10, fontWeight: '600', color: Colors.ink40, letterSpacing: 0.5, textTransform: 'uppercase' },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.ink10 },
  breakdownTotal: { backgroundColor: Colors.ink05, borderBottomWidth: 0 },
  breakdownDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  breakdownName: { flex: 1, fontSize: 13, color: Colors.ink },
  breakdownBase: { width: 80, fontSize: 12, color: Colors.ink60, textAlign: 'right' },
  breakdownZakat: { width: 70, fontSize: 13, fontWeight: '600', color: Colors.green700, textAlign: 'right' },

  liabilityCard: { backgroundColor: Colors.white, borderRadius: 16, borderWidth: 0.5, borderColor: Colors.ink10, overflow: 'hidden', marginBottom: 8 },
  liabRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13 },
  liabRowBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.ink10 },
  liabIndicator: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  liabName: { fontSize: 13, fontWeight: '500', color: Colors.ink },
  liabRule: { fontSize: 11, color: Colors.ink40, marginTop: 1 },
  liabAmt: { fontSize: 13, fontWeight: '600', color: Colors.green700 },
  liabStruck: { textDecorationLine: 'line-through', color: Colors.ink20 },
  removeBtn: { padding: 4 },
  removeBtnText: { fontSize: 18, color: Colors.ink20 },

  addBtn: { borderWidth: 0.5, borderStyle: 'dashed', borderColor: Colors.ink20, borderRadius: 14, padding: 14, alignItems: 'center', backgroundColor: Colors.white, marginBottom: 8 },
  addBtnText: { fontSize: 13, color: Colors.ink60, fontWeight: '500' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: Colors.ink, marginBottom: 18 },
  fieldLabel: { fontSize: 12, color: Colors.ink60, marginBottom: 5 },
  input: { borderWidth: 0.5, borderColor: Colors.ink10, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.ink, marginBottom: 14 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  typeOpt: { flex: 1, borderWidth: 0.5, borderColor: Colors.ink10, borderRadius: 10, padding: 9, alignItems: 'center' },
  typeOptActive: { borderColor: Colors.green500, backgroundColor: Colors.green50 },
  typeText: { fontSize: 12, fontWeight: '500', color: Colors.ink60 },
  infoBox: { backgroundColor: Colors.green50, borderRadius: 10, padding: 10 },
  infoText: { fontSize: 12, color: Colors.green600, lineHeight: 17 },
});
