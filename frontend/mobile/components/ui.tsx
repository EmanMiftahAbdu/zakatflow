import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants/colors';

// ── Button ────────────────────────────────────

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
}: ButtonProps) {
  const styles = buttonStyles(variant, disabled);
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.btn, fullWidth && { width: '100%' }]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? Colors.white : Colors.green600} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const buttonStyles = (variant: string, disabled: boolean) =>
  StyleSheet.create({
    btn: {
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        variant === 'primary' ? Colors.green700
        : variant === 'danger'  ? Colors.red600
        : 'transparent',
      borderWidth: variant === 'outline' ? 1 : 0,
      borderColor: Colors.ink10,
      opacity: disabled ? 0.5 : 1,
    },
    label: {
      fontSize: 15,
      fontWeight: '600',
      color:
        variant === 'primary' ? Colors.white
        : variant === 'danger'  ? Colors.white
        : variant === 'ghost'   ? Colors.green500
        : Colors.ink,
    },
  });

// ── Card ─────────────────────────────────────

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[cardStyles.card, style]}>
      {children}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: Colors.ink10,
    padding: 16,
    marginBottom: 12,
  },
});

// ── RibaBadge ─────────────────────────────────

export function RibaBadge() {
  return (
    <View style={badgeStyles.ribaBadge}>
      <View style={badgeStyles.dot} />
      <Text style={badgeStyles.ribaText}>Riba</Text>
    </View>
  );
}

export function CleanBadge() {
  return (
    <View style={badgeStyles.cleanBadge}>
      <Text style={badgeStyles.cleanText}>✓ Clean</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  ribaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.red50,
    borderColor: Colors.red200,
    borderWidth: 0.5,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.red600,
  },
  ribaText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.red600,
  },
  cleanBadge: {
    backgroundColor: Colors.green50,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cleanText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.green600,
  },
});

// ── SectionLabel ──────────────────────────────

export function SectionLabel({ label }: { label: string }) {
  return <Text style={sectionStyles.label}>{label}</Text>;
}

const sectionStyles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.ink40,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 16,
  },
});

// ── HawlProgressBar ──────────────────────────

export function HawlProgressBar({
  progress,
  daysLeft,
  startLabel,
  endLabel,
}: {
  progress: number;
  daysLeft: number;
  startLabel: string;
  endLabel: string;
}) {
  return (
    <View>
      <View style={hawlStyles.row}>
        <Text style={hawlStyles.title}>Hawl progress</Text>
        <View style={hawlStyles.badge}>
          <Text style={hawlStyles.badgeText}>{daysLeft} days left</Text>
        </View>
      </View>
      <View style={hawlStyles.track}>
        <View style={[hawlStyles.fill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
      <View style={hawlStyles.dateRow}>
        <Text style={hawlStyles.dateText}>{startLabel}</Text>
        <Text style={[hawlStyles.dateText, { color: Colors.green500 }]}>{endLabel}</Text>
      </View>
    </View>
  );
}

const hawlStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 13, fontWeight: '500', color: Colors.ink },
  badge: { backgroundColor: Colors.green50, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '500', color: Colors.green600 },
  track: { height: 6, backgroundColor: Colors.ink05, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  fill: { height: '100%', backgroundColor: Colors.green600, borderRadius: 3 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dateText: { fontSize: 10, color: Colors.ink40 },
});
