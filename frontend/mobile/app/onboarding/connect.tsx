import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Modal, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { create, open } from 'react-native-plaid-link-sdk';
import type { LinkSuccess, LinkExit } from 'react-native-plaid-link-sdk';
import { useZakatStore } from '../../store/zakatStore';
import { Button, RibaBadge, CleanBadge, SectionLabel } from '../../components/ui';
import { Colors } from '../../constants/colors';
import { detectRiba, GoldAsset, CashAsset } from '../../engine/zakatEngine';
import { GOLD_PRICE_PER_GRAM_USD } from '../../engine/zakatEngine';
import * as Crypto from 'expo-crypto';
import { getPlaidLinkToken, exchangePlaidToken, syncPlaidAssets } from '../../lib/api';

function karat(k: number) {
  const map: Record<number, number> = { 9: 0.375, 14: 0.585, 18: 0.75, 22: 0.916, 24: 1.0 };
  return map[k] ?? 1.0;
}

export default function ConnectScreen() {
  const { addAsset, assets, completeOnboarding, persistAsset, loadAssets } = useZakatStore();
  const [plaidLinked, setPlaidLinked] = useState(false);
  const [plaidLoading, setPlaidLoading] = useState(false);
  const [showGoldModal, setShowGoldModal] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);

  // Gold form state
  const [goldLabel, setGoldLabel] = useState('');
  const [goldWeight, setGoldWeight] = useState('');
  const [goldKarat, setGoldKarat] = useState<number>(22);
  const [goldWorn, setGoldWorn] = useState(false);

  // Cash form state
  const [cashLabel, setCashLabel] = useState('');
  const [cashAmount, setCashAmount] = useState('');

  async function openPlaidLink() {
    setPlaidLoading(true);
    try {
      const { link_token } = await getPlaidLinkToken();
      create({ token: link_token });
      await open({
        onSuccess: async (success: LinkSuccess) => {
          try {
            await exchangePlaidToken(success.publicToken);
            await syncPlaidAssets();
            await loadAssets();
            setPlaidLinked(true);
            Alert.alert('Connected', 'Accounts linked successfully.');
          } catch {
            Alert.alert('Error', 'Accounts connected but failed to sync. Try again from Overview.');
            setPlaidLinked(true);
          }
        },
        onExit: (_exit: LinkExit) => {
          // User closed Plaid Link — nothing to do
        },
      });
    } catch {
      Alert.alert('Error', 'Could not connect to Plaid. Make sure the backend is running.');
    } finally {
      setPlaidLoading(false);
    }
  }

  async function addGold() {
    if (!goldWeight) return;
    const id = await Crypto.randomUUID();
    const asset: GoldAsset = {
      type: 'gold',
      id,
      label: goldLabel || `${goldKarat}k Gold`,
      weightGrams: parseFloat(goldWeight),
      karatPurity: karat(goldKarat),
      isWorn: goldWorn,
      pricePerGram: GOLD_PRICE_PER_GRAM_USD,
    };
    addAsset(asset);
    setShowGoldModal(false);
    setGoldLabel(''); setGoldWeight(''); setGoldKarat(22); setGoldWorn(false);
    try { await persistAsset(asset); } catch {}
  }

  async function addCash() {
    if (!cashAmount) return;
    const id = await Crypto.randomUUID();
    const asset: CashAsset = {
      type: 'cash',
      id,
      label: cashLabel || 'Cash at home',
      balance: parseFloat(cashAmount),
      isRiba: false,
      interestEarned: 0,
    };
    addAsset(asset);
    setShowCashModal(false);
    setCashLabel(''); setCashAmount('');
    try { await persistAsset(asset); } catch {}
  }

  function handleFinish() {
    completeOnboarding();
    router.replace('/tabs/overview');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.dots}>
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={[styles.dot, styles.dotActive]} />
      </View>

      <Text style={styles.title}>Connect accounts</Text>
      <Text style={styles.subtitle}>
        Link your bank and investment accounts. Riba (interest) is detected
        and excluded automatically.
      </Text>

      {/* Plaid */}
      <View style={styles.plaidRow}>
        <View>
          <Text style={styles.plaidLabel}>Plaid</Text>
          <Text style={styles.plaidSub}>Bank, savings, investments</Text>
        </View>
        <TouchableOpacity
          style={styles.plaidBtn}
          onPress={openPlaidLink}
          disabled={plaidLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.plaidBtnText}>
            {plaidLoading ? 'Loading…' : plaidLinked ? 'Connected ✓' : 'Connect'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Connected / added assets */}
      {assets.length > 0 && (
        <>
          <SectionLabel label="Connected" />
          <View style={styles.accountCard}>
            {assets.map((asset, i) => {
              const isRiba = asset.type === 'cash' && (asset as any).isRiba;
              const value =
                asset.type === 'cash'       ? (asset as any).balance
                : asset.type === 'gold'     ? (asset as GoldAsset).weightGrams * (asset as GoldAsset).karatPurity * (asset as GoldAsset).pricePerGram
                : 0;

              return (
                <View
                  key={asset.id}
                  style={[styles.accRow, i < assets.length - 1 && styles.accRowBorder]}
                >
                  <View style={styles.accLogo}>
                    <Text style={styles.accLogoText}>{asset.label[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.accName}>{asset.label}</Text>
                    <View style={styles.accSubRow}>
                      <Text style={styles.accSub}>{asset.type}</Text>
                      {isRiba ? <RibaBadge /> : <CleanBadge />}
                    </View>
                  </View>
                  <Text style={styles.accAmt}>${value?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* Manual entry */}
      <SectionLabel label="Add manually" />
      <TouchableOpacity style={styles.addBtn} onPress={() => setShowGoldModal(true)}>
        <View style={styles.plusCircle}><Text style={styles.plusText}>+</Text></View>
        <Text style={styles.addBtnText}>Add gold / jewellery</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.addBtn} onPress={() => setShowCashModal(true)}>
        <View style={styles.plusCircle}><Text style={styles.plusText}>+</Text></View>
        <Text style={styles.addBtnText}>Add cash at home</Text>
      </TouchableOpacity>

      <View style={{ marginTop: 16 }}>
        <Button label="Finish setup" onPress={handleFinish} />
      </View>

      {/* ── Gold modal ── */}
      <Modal visible={showGoldModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add gold / jewellery</Text>
            <Text style={styles.fieldLabel}>Label (optional)</Text>
            <TextInput style={styles.input} value={goldLabel} onChangeText={setGoldLabel} placeholder="e.g. Wedding ring" placeholderTextColor={Colors.ink20} />
            <Text style={styles.fieldLabel}>Weight (grams)</Text>
            <TextInput style={styles.input} value={goldWeight} onChangeText={setGoldWeight} placeholder="e.g. 15" keyboardType="decimal-pad" placeholderTextColor={Colors.ink20} />
            <Text style={styles.fieldLabel}>Karat</Text>
            <View style={styles.karatRow}>
              {[9, 14, 18, 22, 24].map((k) => (
                <TouchableOpacity
                  key={k}
                  style={[styles.karatOpt, goldKarat === k && styles.karatOptActive]}
                  onPress={() => setGoldKarat(k)}
                >
                  <Text style={[styles.karatText, goldKarat === k && { color: Colors.green700 }]}>{k}k</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.wornToggle} onPress={() => setGoldWorn(!goldWorn)}>
              <View style={[styles.checkbox, goldWorn && styles.checkboxActive]}>
                {goldWorn && <Text style={{ color: Colors.white, fontSize: 10 }}>✓</Text>}
              </View>
              <Text style={styles.wornLabel}>This is worn jewellery (not stored)</Text>
            </TouchableOpacity>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Shafi'i, Maliki & Hanbali: worn jewellery is exempt.{'\n'}
                Hanafi: all gold is zakatable regardless of use.
              </Text>
            </View>
            <View style={styles.modalBtns}>
              <Button label="Add gold" onPress={addGold} />
              <Button label="Cancel" onPress={() => setShowGoldModal(false)} variant="outline" />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Cash modal ── */}
      <Modal visible={showCashModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add cash</Text>
            <Text style={styles.fieldLabel}>Label (optional)</Text>
            <TextInput style={styles.input} value={cashLabel} onChangeText={setCashLabel} placeholder="e.g. Cash at home" placeholderTextColor={Colors.ink20} />
            <Text style={styles.fieldLabel}>Amount ($)</Text>
            <TextInput style={styles.input} value={cashAmount} onChangeText={setCashAmount} placeholder="0.00" keyboardType="decimal-pad" placeholderTextColor={Colors.ink20} />
            <View style={[styles.infoBox, { marginBottom: 16 }]}>
              <Text style={styles.infoText}>Cash at home is zakatable at 2.5% — no riba concerns.</Text>
            </View>
            <View style={styles.modalBtns}>
              <Button label="Add cash" onPress={addCash} />
              <Button label="Cancel" onPress={() => setShowCashModal(false)} variant="outline" />
            </View>
          </View>
        </View>
      </Modal>
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
  subtitle: { fontSize: 14, color: Colors.ink60, lineHeight: 20, marginBottom: 24 },
  plaidRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 0.5, borderColor: Colors.ink10, borderRadius: 14, padding: 14, marginBottom: 4,
  },
  plaidLabel: { fontSize: 14, fontWeight: '600', color: Colors.green700 },
  plaidSub: { fontSize: 11, color: Colors.ink40, marginTop: 2 },
  plaidBtn: { backgroundColor: Colors.green700, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  plaidBtnText: { fontSize: 12, fontWeight: '600', color: Colors.white },
  accountCard: { borderWidth: 0.5, borderColor: Colors.ink10, borderRadius: 14, overflow: 'hidden', marginBottom: 4 },
  accRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  accRowBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.ink10 },
  accLogo: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.green50, alignItems: 'center', justifyContent: 'center' },
  accLogoText: { fontSize: 13, fontWeight: '600', color: Colors.green700 },
  accName: { fontSize: 13, fontWeight: '500', color: Colors.ink },
  accSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  accSub: { fontSize: 11, color: Colors.ink40 },
  accAmt: { fontSize: 13, fontWeight: '600', color: Colors.ink },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 0.5, borderStyle: 'dashed', borderColor: Colors.ink20,
    borderRadius: 14, backgroundColor: Colors.ink05,
    padding: 14, marginBottom: 10,
  },
  plusCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: Colors.ink40, alignItems: 'center', justifyContent: 'center' },
  plusText: { fontSize: 14, color: Colors.ink40, lineHeight: 16 },
  addBtnText: { fontSize: 14, color: Colors.ink60 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: Colors.ink, marginBottom: 18 },
  fieldLabel: { fontSize: 12, color: Colors.ink60, marginBottom: 5 },
  input: { borderWidth: 0.5, borderColor: Colors.ink10, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.ink, marginBottom: 14 },
  karatRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  karatOpt: { flex: 1, borderWidth: 0.5, borderColor: Colors.ink10, borderRadius: 8, padding: 8, alignItems: 'center' },
  karatOptActive: { borderColor: Colors.green500, backgroundColor: Colors.green50 },
  karatText: { fontSize: 13, fontWeight: '500', color: Colors.ink60 },
  wornToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: Colors.ink20, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: Colors.green600, borderColor: Colors.green600 },
  wornLabel: { fontSize: 13, color: Colors.ink60 },
  infoBox: { backgroundColor: Colors.green50, borderRadius: 10, padding: 10, marginBottom: 8 },
  infoText: { fontSize: 12, color: Colors.green600, lineHeight: 17 },
  modalBtns: { gap: 8, marginTop: 4 },
});
