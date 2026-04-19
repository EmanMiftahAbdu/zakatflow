import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch,
} from 'react-native';
import { router } from 'expo-router';
import { useZakatStore } from '../../store/zakatStore';
import { Colors } from '../../constants/colors';

export default function ProfileScreen() {
  const { profile, setProfile, logout, saveProfile } = useZakatStore();
  const zakatResult = useZakatStore((s) => s.getZakatResult());

  async function handleLogout() {
    await logout();
    router.replace('/auth/signup');
  }

  async function handleMadhabPress() {
    router.push('/onboarding/madhab');
  }

  async function handleNisabPress() {
    router.push('/onboarding/nisab');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User header */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile.name ? profile.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'ZF'}
          </Text>
        </View>
        <View>
          <Text style={styles.userName}>{profile.name || 'Your name'}</Text>
          <Text style={styles.userEmail}>{profile.email || 'your@email.com'}</Text>
        </View>
      </View>

      {/* Zakat summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>${zakatResult.zakatDue.toFixed(0)}</Text>
          <Text style={styles.summaryLabel}>Zakat due</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>${zakatResult.netZakatableWealth.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
          <Text style={styles.summaryLabel}>Net wealth</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>${zakatResult.purificationAmount.toFixed(0)}</Text>
          <Text style={styles.summaryLabel}>To purify</Text>
        </View>
      </View>

      {/* Calculation preferences */}
      <Text style={styles.sectionLabel}>CALCULATION SETTINGS</Text>
      <View style={styles.settingsCard}>
        <SettingsRow
          label="Madhab"
          value={profile.madhab.charAt(0).toUpperCase() + profile.madhab.slice(1)}
          onPress={handleMadhabPress}
        />
        <SettingsRow
          label="Nisab standard"
          value={profile.nisabStandard === 'silver' ? 'Silver (595g)' : 'Gold (85g)'}
          onPress={handleNisabPress}
        />
        <SettingsRow
          label="Last Zakat paid"
          value={
            profile.lastZakatPaidDate
              ? new Date(profile.lastZakatPaidDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
              : 'Not set'
          }
          onPress={handleNisabPress}
        />
      </View>

      {/* Notifications */}
      <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
      <View style={styles.settingsCard}>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Hawl reminders</Text>
            <Text style={styles.switchSub}>30 days, 7 days, and day of</Text>
          </View>
          <Switch
            value={profile.notificationsEnabled}
            onValueChange={(v) => setProfile({ notificationsEnabled: v })}
            trackColor={{ true: Colors.green500, false: Colors.ink10 }}
            thumbColor={Colors.white}
          />
        </View>
      </View>

      {/* Fiqh info */}
      <Text style={styles.sectionLabel}>ABOUT ZAKAT</Text>
      <View style={styles.settingsCard}>
        <SettingsRow label="Rulings & sources" value="" onPress={() => {}} />
        <SettingsRow label="Purification guide" value="" onPress={() => {}} />
        <SettingsRow label="Zakat distribution (8 categories)" value="" onPress={() => {}} />
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>ZakatFlow · Hackathon build · Apr 2026</Text>
    </ScrollView>
  );
}

function SettingsRow({
  label, value, onPress,
}: {
  label: string; value: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={rowStyles.row} onPress={onPress} activeOpacity={0.7}>
      <Text style={rowStyles.label}>{label}</Text>
      <View style={rowStyles.right}>
        {value ? <Text style={rowStyles.value}>{value}</Text> : null}
        <Text style={rowStyles.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: Colors.ink10,
  },
  label: { fontSize: 14, color: Colors.ink },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  value: { fontSize: 13, color: Colors.ink40 },
  arrow: { fontSize: 18, color: Colors.ink20 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.ink05 },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.white, borderRadius: 16,
    borderWidth: 0.5, borderColor: Colors.ink10,
    padding: 16, marginBottom: 12,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.green700,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '600', color: Colors.white },
  userName: { fontSize: 16, fontWeight: '600', color: Colors.ink },
  userEmail: { fontSize: 13, color: Colors.ink40, marginTop: 2 },
  summaryRow: {
    flexDirection: 'row', backgroundColor: Colors.white,
    borderRadius: 16, borderWidth: 0.5, borderColor: Colors.ink10,
    padding: 16, marginBottom: 20,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 0.5, backgroundColor: Colors.ink10 },
  summaryValue: { fontSize: 18, fontWeight: '600', color: Colors.green700 },
  summaryLabel: { fontSize: 11, color: Colors.ink40, marginTop: 3 },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: Colors.ink40, letterSpacing: 0.8, marginBottom: 8 },
  settingsCard: {
    backgroundColor: Colors.white, borderRadius: 16,
    borderWidth: 0.5, borderColor: Colors.ink10,
    paddingHorizontal: 16, marginBottom: 20,
  },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12,
  },
  switchLabel: { fontSize: 14, color: Colors.ink },
  switchSub: { fontSize: 11, color: Colors.ink40, marginTop: 2 },
  logoutBtn: {
    borderWidth: 0.5, borderColor: Colors.red200,
    borderRadius: 14, padding: 14,
    alignItems: 'center', backgroundColor: Colors.red50, marginBottom: 16,
  },
  logoutText: { fontSize: 14, fontWeight: '600', color: Colors.red600 },
  version: { textAlign: 'center', fontSize: 11, color: Colors.ink20 },
});
