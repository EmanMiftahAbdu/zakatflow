import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useZakatStore } from '../../store/zakatStore';
import { Colors } from '../../constants/colors';
import {
  getHawlProgress,
  getDaysUntilHawl,
  getHawlDueDate,
  HAWL_DAYS,
} from '../../engine/zakatEngine';

export default function HawlScreen() {
  const { profile } = useZakatStore();

  const lastPaid = profile.lastZakatPaidDate
    ? new Date(profile.lastZakatPaidDate)
    : null;

  const progress  = lastPaid ? getHawlProgress(lastPaid) : 0;
  const daysLeft  = lastPaid ? getDaysUntilHawl(lastPaid) : HAWL_DAYS;
  const dueDate   = lastPaid ? getHawlDueDate(lastPaid) : null;
  const daysPast  = HAWL_DAYS - daysLeft;
  const pct       = Math.round(progress * 100);
  const isOverdue = daysLeft === 0 && lastPaid != null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Hawl tracker</Text>
      <Text style={styles.pageSub}>One lunar year = {HAWL_DAYS} days</Text>

      {/* Big progress circle */}
      <View style={styles.circleCard}>
        <View style={styles.circleOuter}>
          <View style={styles.circleInner}>
            <Text style={styles.circlePercent}>{pct}%</Text>
            <Text style={styles.circleLabel}>complete</Text>
          </View>
        </View>
        <View style={styles.circleStats}>
          <View style={styles.circleStat}>
            <Text style={styles.circleStatValue}>{daysPast}</Text>
            <Text style={styles.circleStatLabel}>days elapsed</Text>
          </View>
          <View style={styles.circleStatDivider} />
          <View style={styles.circleStat}>
            <Text style={[styles.circleStatValue, { color: isOverdue ? Colors.red600 : Colors.green500 }]}>
              {isOverdue ? 'Overdue' : daysLeft}
            </Text>
            <Text style={styles.circleStatLabel}>days remaining</Text>
          </View>
          <View style={styles.circleStatDivider} />
          <View style={styles.circleStat}>
            <Text style={styles.circleStatValue}>{HAWL_DAYS}</Text>
            <Text style={styles.circleStatLabel}>total days</Text>
          </View>
        </View>
      </View>

      {/* Status banner */}
      {isOverdue ? (
        <View style={[styles.statusBanner, { backgroundColor: Colors.red50, borderColor: Colors.red200 }]}>
          <Text style={[styles.statusTitle, { color: Colors.red800 }]}>Zakat is overdue</Text>
          <Text style={[styles.statusSub, { color: Colors.red600 }]}>
            Your hawl year has passed. Pay Zakat as soon as possible — the obligation
            remains and is recorded as a debt owed to Allah.
          </Text>
        </View>
      ) : pct >= 80 ? (
        <View style={[styles.statusBanner, { backgroundColor: Colors.gold100, borderColor: Colors.gold200 }]}>
          <Text style={[styles.statusTitle, { color: Colors.gold700 }]}>Zakat due soon</Text>
          <Text style={[styles.statusSub, { color: Colors.gold600 }]}>
            Your hawl year is almost complete. Start preparing your Zakat payment.
          </Text>
        </View>
      ) : (
        <View style={[styles.statusBanner, { backgroundColor: Colors.green50, borderColor: Colors.green200 }]}>
          <Text style={[styles.statusTitle, { color: Colors.green800 }]}>Hawl in progress</Text>
          <Text style={[styles.statusSub, { color: Colors.green600 }]}>
            Your wealth has been above nisab for {daysPast} days. Keep tracking — Zakat
            becomes due on{' '}
            {dueDate?.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) ?? '—'}.
          </Text>
        </View>
      )}

      {/* Timeline */}
      <Text style={styles.sectionLabel}>TIMELINE</Text>
      <View style={styles.timelineCard}>
        <TimelineRow
          date={lastPaid?.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) ?? '—'}
          label="Hawl started"
          sub="Last Zakat paid · nisab threshold exceeded"
          active
          isFirst
        />
        <TimelineRow
          date={lastPaid ? new Date(lastPaid.getTime() + (HAWL_DAYS / 2) * 86400000).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
          label="Midpoint"
          sub={`${Math.round(HAWL_DAYS / 2)} days · Maintain nisab to keep hawl valid`}
          active={pct >= 50}
        />
        <TimelineRow
          date={dueDate?.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) ?? '—'}
          label="Zakat due"
          sub={`${HAWL_DAYS} days · Pay 2.5% of net zakatable wealth`}
          active={isOverdue}
          isLast
        />
      </View>

      {/* Madhab note on hawl */}
      <View style={styles.madhabNote}>
        <Text style={styles.madhabNoteTitle}>
          Hawl ruling · {profile.madhab.charAt(0).toUpperCase() + profile.madhab.slice(1)}
        </Text>
        <Text style={styles.madhabNoteText}>
          {profile.madhab === 'hanafi'
            ? 'Hanafi view: the hawl is valid as long as your wealth meets nisab at the start and end of the year. Dips below nisab mid-year do not reset the clock.'
            : 'Majority view (Shafi\'i, Maliki, Hanbali): nisab must be maintained throughout the entire year. If wealth falls below nisab at any point, the hawl resets from zero.'}
        </Text>
      </View>

      {/* Update date CTA */}
      <TouchableOpacity
        style={styles.updateBtn}
        onPress={() => router.push('/onboarding/nisab')}
        activeOpacity={0.8}
      >
        <Text style={styles.updateBtnText}>Update last payment date</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function TimelineRow({
  date, label, sub, active, isFirst, isLast,
}: {
  date: string; label: string; sub: string;
  active?: boolean; isFirst?: boolean; isLast?: boolean;
}) {
  return (
    <View style={tlStyles.row}>
      <View style={tlStyles.left}>
        <View style={[tlStyles.dot, active && tlStyles.dotActive]} />
        {!isLast && <View style={[tlStyles.line, active && tlStyles.lineActive]} />}
      </View>
      <View style={tlStyles.body}>
        <Text style={tlStyles.date}>{date}</Text>
        <Text style={[tlStyles.label, active && { color: Colors.green700 }]}>{label}</Text>
        <Text style={tlStyles.sub}>{sub}</Text>
      </View>
    </View>
  );
}

const tlStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14, marginBottom: 4 },
  left: { alignItems: 'center', width: 16 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: Colors.ink10, backgroundColor: Colors.white, marginTop: 2 },
  dotActive: { borderColor: Colors.green500, backgroundColor: Colors.green500 },
  line: { width: 2, flex: 1, backgroundColor: Colors.ink10, marginVertical: 4 },
  lineActive: { backgroundColor: Colors.green200 },
  body: { flex: 1, paddingBottom: 20 },
  date: { fontSize: 11, color: Colors.ink40, marginBottom: 2 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.ink, marginBottom: 3 },
  sub: { fontSize: 12, color: Colors.ink60, lineHeight: 17 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.ink05 },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  pageTitle: { fontSize: 24, fontWeight: '600', color: Colors.ink, marginBottom: 4 },
  pageSub: { fontSize: 13, color: Colors.ink40, marginBottom: 20 },
  circleCard: {
    backgroundColor: Colors.white, borderRadius: 20,
    borderWidth: 0.5, borderColor: Colors.ink10,
    padding: 24, alignItems: 'center', marginBottom: 12,
  },
  circleOuter: {
    width: 140, height: 140, borderRadius: 70,
    borderWidth: 10, borderColor: Colors.green100,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  circleInner: { alignItems: 'center' },
  circlePercent: { fontSize: 32, fontWeight: '600', color: Colors.green700 },
  circleLabel: { fontSize: 12, color: Colors.ink40 },
  circleStats: { flexDirection: 'row', width: '100%' },
  circleStat: { flex: 1, alignItems: 'center' },
  circleStatDivider: { width: 0.5, backgroundColor: Colors.ink10 },
  circleStatValue: { fontSize: 18, fontWeight: '600', color: Colors.ink },
  circleStatLabel: { fontSize: 10, color: Colors.ink40, marginTop: 2 },
  statusBanner: {
    borderRadius: 14, borderWidth: 0.5,
    padding: 14, marginBottom: 16,
  },
  statusTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  statusSub: { fontSize: 13, lineHeight: 19 },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: Colors.ink40, letterSpacing: 0.8, marginBottom: 12, marginTop: 4 },
  timelineCard: {
    backgroundColor: Colors.white, borderRadius: 16,
    borderWidth: 0.5, borderColor: Colors.ink10,
    padding: 16, marginBottom: 12,
  },
  madhabNote: {
    backgroundColor: Colors.green50, borderRadius: 14,
    borderWidth: 0.5, borderColor: Colors.green200,
    padding: 14, marginBottom: 12,
  },
  madhabNoteTitle: { fontSize: 12, fontWeight: '600', color: Colors.green800, marginBottom: 5 },
  madhabNoteText: { fontSize: 12, color: Colors.green600, lineHeight: 18 },
  updateBtn: {
    borderWidth: 0.5, borderColor: Colors.ink20,
    borderRadius: 14, padding: 14, alignItems: 'center',
    backgroundColor: Colors.white,
  },
  updateBtnText: { fontSize: 13, color: Colors.ink60, fontWeight: '500' },
});
