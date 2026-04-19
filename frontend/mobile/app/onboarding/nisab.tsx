import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform,
} from 'react-native';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useZakatStore } from '../../store/zakatStore';
import { Button } from '../../components/ui';
import { Colors } from '../../constants/colors';
import {
  getNisabValues,
  getHawlDueDate,
  HAWL_DAYS,
} from '../../engine/zakatEngine';
import { getNisabCurrent } from '../../lib/api';

export default function NisabScreen() {
  const { profile, setProfile, saveProfile } = useZakatStore();
  const [nisab, setNisab] = useState<'gold' | 'silver'>(profile.nisabStandard);
  const [neverPaid, setNeverPaid] = useState(!profile.lastZakatPaidDate);
  const [lastPaid, setLastPaid] = useState<Date>(
    profile.lastZakatPaidDate
      ? new Date(profile.lastZakatPaidDate)
      : new Date(Date.now() - HAWL_DAYS * 24 * 60 * 60 * 1000)
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [liveNisab, setLiveNisab] = useState<{ gold: number; silver: number } | null>(null);

  const nisabValues = liveNisab ?? getNisabValues();

  // When "Never paid", hawl starts today so due date is 354 days from now
  const hawlStart = neverPaid ? new Date() : lastPaid;
  const dueDate = getHawlDueDate(hawlStart);

  useEffect(() => {
    getNisabCurrent()
      .then((data) => setLiveNisab({ gold: data.gold_nisab_usd, silver: data.silver_nisab_usd }))
      .catch(() => {});
  }, []);

  async function requestNotifications() {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      await scheduleHawlReminders(dueDate);
      setProfile({ notificationsEnabled: true });
    }
  }

  async function scheduleHawlReminders(due: Date) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const reminders = [
      { daysBeforeOffset: 30, title: 'Zakat reminder', body: 'Your Zakat is due in 30 days.' },
      { daysBeforeOffset: 7,  title: 'Zakat due soon', body: 'Your Zakat is due in 7 days.' },
      { daysBeforeOffset: 0,  title: 'Zakat due today', body: 'Today is your Zakat due date. May Allah accept it from you.' },
    ];
    for (const r of reminders) {
      const triggerDate = new Date(due);
      triggerDate.setDate(triggerDate.getDate() - r.daysBeforeOffset);
      if (triggerDate > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: { title: r.title, body: r.body },
          trigger: { type: 'date', date: triggerDate } as any,
        });
      }
    }
  }

  async function handleContinue() {
    const hawlStartDate = neverPaid ? new Date() : lastPaid;
    const paidDate = neverPaid ? null : lastPaid.toISOString();

    setProfile({
      nisabStandard: nisab,
      lastZakatPaidDate: paidDate,
    });

    saveProfile({
      nisab_standard: nisab,
      hawl_start_date: hawlStartDate.toISOString().slice(0, 10),
    }).catch(() => {});

    router.push('/onboarding/connect');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.dots}>
        <View style={styles.dot} />
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
      </View>

      <Text style={styles.title}>Nisab & hawl</Text>
      <Text style={styles.subtitle}>
        Set your nisab standard and last payment date so we can track when
        your next Zakat is due.
      </Text>

      {/* Nisab standard */}
      <Text style={styles.sectionLabel}>NISAB STANDARD</Text>
      <View style={styles.nisabRow}>
        {(['gold', 'silver'] as const).map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.nisabOpt, nisab === opt && styles.nisabOptActive]}
            onPress={() => setNisab(opt)}
            activeOpacity={0.8}
          >
            <Text style={[styles.nisabOptLabel, nisab === opt && styles.nisabOptLabelActive]}>
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </Text>
            <Text style={[styles.nisabOptValue, nisab === opt && { color: Colors.green600 }]}>
              {opt === 'gold'
                ? `85g · ~$${nisabValues.gold.toFixed(0)}`
                : `595g · ~$${nisabValues.silver.toFixed(0)}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {nisab === 'silver' && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Most contemporary scholars recommend the silver standard — a lower
            threshold that ensures more Muslims fulfil their obligation.
          </Text>
        </View>
      )}

      {/* Last Zakat paid */}
      <Text style={[styles.sectionLabel, { marginTop: 20 }]}>LAST ZAKAT PAYMENT</Text>

      {/* Never / Date toggle */}
      <View style={styles.paymentToggleRow}>
        <TouchableOpacity
          style={[styles.paymentToggleOpt, neverPaid && styles.paymentToggleOptActive]}
          onPress={() => setNeverPaid(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.paymentToggleText, neverPaid && styles.paymentToggleTextActive]}>
            Never paid
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.paymentToggleOpt, !neverPaid && styles.paymentToggleOptActive]}
          onPress={() => setNeverPaid(false)}
          activeOpacity={0.8}
        >
          <Text style={[styles.paymentToggleText, !neverPaid && styles.paymentToggleTextActive]}>
            Select date
          </Text>
        </TouchableOpacity>
      </View>

      {neverPaid ? (
        <View style={styles.neverBox}>
          <Text style={styles.neverText}>
            Your hawl will start from today. Zakat will be due in 354 days.
          </Text>
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={styles.dateField}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.8}
          >
            <View>
              <Text style={styles.dateFieldLabel}>Date paid</Text>
              <Text style={styles.dateFieldValue}>
                {lastPaid.toLocaleDateString('en-US', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </Text>
            </View>
            <View style={styles.calIcon}>
              <View style={styles.calTop} />
            </View>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={lastPaid}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (date) setLastPaid(date);
              }}
            />
          )}
        </>
      )}

      {/* Next due */}
      <View style={styles.nextDueRow}>
        <Text style={styles.nextDueLabel}>Next Zakat due</Text>
        <Text style={styles.nextDueValue}>
          {dueDate.toLocaleDateString('en-US', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
        </Text>
      </View>

      {/* Notification prompt */}
      <View style={styles.notifCard}>
        <View style={styles.notifIconBox}>
          <Text style={{ fontSize: 14 }}>🔔</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.notifTitle}>Enable Zakat reminders</Text>
          <Text style={styles.notifSub}>
            Get notified 30 days, 7 days, and on the day your Zakat is due.
          </Text>
          <View style={styles.notifBtns}>
            <TouchableOpacity
              style={styles.allowBtn}
              onPress={requestNotifications}
              activeOpacity={0.8}
            >
              <Text style={styles.allowBtnText}>Allow notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipBtn} activeOpacity={0.8}>
              <Text style={styles.skipBtnText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  subtitle: { fontSize: 14, color: Colors.ink60, lineHeight: 20, marginBottom: 24 },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: Colors.ink40, letterSpacing: 0.8, marginBottom: 10 },
  nisabRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  nisabOpt: {
    flex: 1, borderWidth: 0.5, borderColor: Colors.ink10,
    borderRadius: 12, padding: 12, alignItems: 'center',
  },
  nisabOptActive: { borderWidth: 1.5, borderColor: Colors.green500, backgroundColor: Colors.green50 },
  nisabOptLabel: { fontSize: 14, fontWeight: '600', color: Colors.ink, marginBottom: 3 },
  nisabOptLabelActive: { color: Colors.green700 },
  nisabOptValue: { fontSize: 11, color: Colors.ink40 },
  infoBox: { backgroundColor: Colors.green50, borderRadius: 10, padding: 10, marginBottom: 4 },
  infoText: { fontSize: 12, color: Colors.green600, lineHeight: 17 },
  paymentToggleRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  paymentToggleOpt: {
    flex: 1, borderWidth: 0.5, borderColor: Colors.ink10,
    borderRadius: 12, padding: 12, alignItems: 'center',
  },
  paymentToggleOptActive: { borderWidth: 1.5, borderColor: Colors.green500, backgroundColor: Colors.green50 },
  paymentToggleText: { fontSize: 14, fontWeight: '500', color: Colors.ink60 },
  paymentToggleTextActive: { color: Colors.green700, fontWeight: '600' },
  neverBox: {
    backgroundColor: Colors.green50, borderRadius: 12, padding: 14, marginBottom: 10,
  },
  neverText: { fontSize: 13, color: Colors.green700, lineHeight: 18 },
  dateField: {
    borderWidth: 0.5, borderColor: Colors.ink10,
    borderRadius: 12, padding: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  dateFieldLabel: { fontSize: 12, color: Colors.ink40, marginBottom: 3 },
  dateFieldValue: { fontSize: 14, fontWeight: '500', color: Colors.ink },
  calIcon: { width: 24, height: 24, borderWidth: 1.5, borderColor: Colors.ink20, borderRadius: 5, overflow: 'hidden' },
  calTop: { height: 7, backgroundColor: Colors.green500 },
  nextDueRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, borderWidth: 0.5, borderColor: Colors.ink10,
    borderRadius: 12, marginBottom: 16,
  },
  nextDueLabel: { fontSize: 13, color: Colors.ink60 },
  nextDueValue: { fontSize: 13, fontWeight: '600', color: Colors.green600 },
  notifCard: {
    backgroundColor: Colors.green50, borderWidth: 0.5, borderColor: Colors.green200,
    borderRadius: 14, padding: 14,
    flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 20,
  },
  notifIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.green600, alignItems: 'center', justifyContent: 'center' },
  notifTitle: { fontSize: 13, fontWeight: '600', color: Colors.green800, marginBottom: 3 },
  notifSub: { fontSize: 12, color: Colors.green600, lineHeight: 17, marginBottom: 10 },
  notifBtns: { flexDirection: 'row', gap: 8 },
  allowBtn: { flex: 1, backgroundColor: Colors.green600, borderRadius: 8, padding: 8, alignItems: 'center' },
  allowBtnText: { fontSize: 12, fontWeight: '600', color: Colors.white },
  skipBtn: { paddingHorizontal: 12, padding: 8, borderWidth: 0.5, borderColor: Colors.ink10, borderRadius: 8 },
  skipBtnText: { fontSize: 12, color: Colors.ink40 },
});
