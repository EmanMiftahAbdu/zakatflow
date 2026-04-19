import React, { useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { useZakatStore } from '../../store/zakatStore';
import { RibaBadge, CleanBadge, HawlProgressBar, Card, SectionLabel } from '../../components/ui';
import { Colors } from '../../constants/colors';
import {
  getHawlProgress,
  getDaysUntilHawl,
  getHawlDueDate,
  detectRiba,
} from '../../engine/zakatEngine';

export default function OverviewScreen() {
  const { profile, assets, loadAssets, syncProfile } = useZakatStore();
  const zakatResult = useZakatStore((s) => s.getZakatResult());

  useEffect(() => {
    loadAssets().catch(() => {});
    syncProfile().catch(() => {});
  }, []);

  const lastPaid = profile.lastZakatPaidDate
    ? new Date(profile.lastZakatPaidDate)
    : null;

  const hawlProgress = lastPaid ? getHawlProgress(lastPaid) : 0;
  const daysLeft     = lastPaid ? getDaysUntilHawl(lastPaid) : null;
  const dueDate      = lastPaid ? getHawlDueDate(lastPaid) : null;

  const ribaAssets = assets.filter(
    (a) => a.type === 'cash' && (a as any).isRiba
  );
  const totalRiba = zakatResult.totalRibaExcluded;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Assalamu alaykum,</Text>
          <Text style={styles.name}>{profile.name || 'Welcome'}</Text>
        </View>
        <View style={styles.logoMark} />
      </View>

      {/* Zakat summary card */}
      <View style={styles.zakatCard}>
        <Text style={styles.zakatCardLabel}>ZAKAT DUE</Text>
        <Text style={styles.zakatCardAmount}>
          ${zakatResult.zakatDue.toFixed(2)}
        </Text>
        <Text style={styles.zakatCardSub}>
          2.5% of net zakatable wealth ·{' '}
          {profile.nisabStandard === 'silver' ? 'Silver' : 'Gold'} nisab
        </Text>
        <View style={styles.zakatDivider} />
        <View style={styles.zakatRow}>
          <Text style={styles.zakatRowLabel}>Total assets</Text>
          <Text style={styles.zakatRowValue}>${zakatResult.totalRawAssets.toLocaleString()}</Text>
        </View>
        {totalRiba > 0 && (
          <View style={styles.zakatRow}>
            <Text style={styles.zakatRowLabel}>Riba removed</Text>
            <Text style={[styles.zakatRowValue, { color: Colors.red600 }]}>
              −${totalRiba.toFixed(2)}
            </Text>
          </View>
        )}
        <View style={styles.zakatRow}>
          <Text style={styles.zakatRowLabel}>Liabilities deducted</Text>
          <Text style={[styles.zakatRowValue, { color: Colors.red600 }]}>
            −${zakatResult.totalDeductions.toFixed(2)}
          </Text>
        </View>
        <View style={[styles.zakatRow, { marginTop: 6, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.15)' }]}>
          <Text style={[styles.zakatRowLabel, { fontWeight: '600', color: Colors.gold200 }]}>
            Net zakatable
          </Text>
          <Text style={[styles.zakatRowValue, { fontSize: 15 }]}>
            ${zakatResult.netZakatableWealth.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Riba banner — only shown when riba is detected */}
      {totalRiba > 0 && (
        <View style={styles.ribaBanner}>
          <View style={styles.ribaBannerHead}>
            <View style={styles.ribaTriangle}>
              <Text style={styles.ribaTriangleText}>!</Text>
            </View>
            <Text style={styles.ribaBannerTitle}>
              Riba detected across {ribaAssets.length} account{ribaAssets.length > 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.ribaAmounts}>
            <View style={styles.ribaStat}>
              <Text style={styles.ribaStatLabel}>Interest earned</Text>
              <Text style={styles.ribaStatValue}>${totalRiba.toFixed(2)}</Text>
            </View>
            <View style={styles.ribaStat}>
              <Text style={styles.ribaStatLabel}>Excluded from Zakat</Text>
              <Text style={[styles.ribaStatValue, styles.struck]}>${totalRiba.toFixed(2)}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.purifyBtn} activeOpacity={0.8}>
            <Text style={styles.purifyBtnText}>Review purification guidance →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Hawl alert */}
      {lastPaid && daysLeft !== null && dueDate && (
        <Card>
          <HawlProgressBar
            progress={hawlProgress}
            daysLeft={daysLeft}
            startLabel={lastPaid.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            endLabel={`Due ${dueDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`}
          />
        </Card>
      )}

      {/* Accounts list */}
      <SectionLabel label="Accounts" />
      <View style={styles.accountCard}>
        {assets.length === 0 && (
          <View style={{ padding: 16, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: Colors.ink40 }}>No accounts connected yet</Text>
          </View>
        )}
        {assets.map((asset, i) => {
          const isRiba = asset.type === 'cash' && (asset as any).isRiba;
          const value =
            asset.type === 'cash'       ? asset.balance
            : asset.type === 'gold'     ? asset.weightGrams * asset.karatPurity * asset.pricePerGram
            : asset.type === 'crypto'   ? asset.quantity * asset.pricePerUnit
            : asset.type === 'stock'    ? asset.marketValue
            : asset.type === 'retirement' ? asset.balance
            : 0;

          return (
            <View
              key={asset.id}
              style={[
                styles.accRow,
                i < assets.length - 1 && styles.accRowBorder,
              ]}
            >
              <View style={styles.accLogo}>
                <Text style={styles.accLogoText}>{asset.label[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.accName}>{asset.label}</Text>
                <Text style={styles.accType}>{asset.type}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={styles.accAmt}>${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
                {isRiba ? <RibaBadge /> : <CleanBadge />}
              </View>
            </View>
          );
        })}
      </View>

      <TouchableOpacity style={styles.addAccountBtn} activeOpacity={0.8}>
        <Text style={styles.addAccountText}>+ Add account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.ink05 },
  content: { padding: 20, paddingTop: 56, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 12, color: Colors.ink40 },
  name: { fontSize: 22, fontWeight: '600', color: Colors.ink },
  logoMark: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.green500 },

  // Zakat summary card
  zakatCard: {
    backgroundColor: Colors.green800,
    borderRadius: 20, padding: 20, marginBottom: 12,
  },
  zakatCardLabel: { fontSize: 10, color: Colors.green200, letterSpacing: 1, fontWeight: '600' },
  zakatCardAmount: { fontSize: 36, fontWeight: '600', color: Colors.white, marginVertical: 4 },
  zakatCardSub: { fontSize: 12, color: Colors.green300 },
  zakatDivider: { height: 0.5, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 14 },
  zakatRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  zakatRowLabel: { fontSize: 12, color: Colors.green200 },
  zakatRowValue: { fontSize: 13, fontWeight: '500', color: Colors.white },
  gold200: Colors.gold200,

  // Riba banner
  ribaBanner: { backgroundColor: Colors.red50, borderWidth: 0.5, borderColor: Colors.red200, borderRadius: 16, padding: 14, marginBottom: 12 },
  ribaBannerHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  ribaTriangle: { width: 22, height: 22, backgroundColor: Colors.red100, borderRadius: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: Colors.red200 },
  ribaTriangleText: { fontSize: 12, fontWeight: '600', color: Colors.red600 },
  ribaBannerTitle: { fontSize: 13, fontWeight: '600', color: Colors.red800, flex: 1 },
  ribaAmounts: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  ribaStat: { flex: 1, backgroundColor: Colors.white, borderRadius: 10, padding: 10, borderWidth: 0.5, borderColor: Colors.red200 },
  ribaStatLabel: { fontSize: 10, color: Colors.red600 },
  ribaStatValue: { fontSize: 16, fontWeight: '600', color: Colors.red800, marginTop: 2 },
  struck: { textDecorationLine: 'line-through', color: Colors.ink40 },
  purifyBtn: { backgroundColor: Colors.red600, borderRadius: 10, padding: 10, alignItems: 'center' },
  purifyBtnText: { fontSize: 12, fontWeight: '600', color: Colors.white },

  // Accounts
  accountCard: { backgroundColor: Colors.white, borderRadius: 16, borderWidth: 0.5, borderColor: Colors.ink10, overflow: 'hidden', marginBottom: 10 },
  accRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13 },
  accRowBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.ink10 },
  accLogo: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.green50, alignItems: 'center', justifyContent: 'center' },
  accLogoText: { fontSize: 14, fontWeight: '600', color: Colors.green700 },
  accName: { fontSize: 13, fontWeight: '500', color: Colors.ink },
  accType: { fontSize: 11, color: Colors.ink40, marginTop: 1, textTransform: 'capitalize' },
  accAmt: { fontSize: 13, fontWeight: '600', color: Colors.ink },
  addAccountBtn: { borderWidth: 0.5, borderStyle: 'dashed', borderColor: Colors.ink20, borderRadius: 14, padding: 14, alignItems: 'center', backgroundColor: Colors.white },
  addAccountText: { fontSize: 13, color: Colors.ink60, fontWeight: '500' },
});
