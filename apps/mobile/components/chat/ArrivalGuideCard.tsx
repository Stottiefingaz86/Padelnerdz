import { colors, radii, spacing } from '@padel-nerdz/config';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  venue?: string | null;
  onOpenTicket?: () => void;
  organiserView?: boolean;
};

/**
 * Session-room guide, what to do at the courts (check-in QR / organiser mark).
 */
export function ArrivalGuideCard({ venue, onOpenTicket, organiserView }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.botRow}>
          <View style={styles.botAvatar}>
            <Text style={styles.botMark}>PN</Text>
          </View>
          <Text style={styles.botName}>Padel Nerdz</Text>
        </View>
        <Text style={styles.kicker}>WHEN YOU ARRIVE</Text>
        <Text style={styles.title}>Check in at the courts</Text>
        <Text style={styles.sub}>
          {venue?.trim()
            ? `Meet at ${venue.trim()}. `
            : 'Find your venue. '}
          {organiserView
            ? 'Scan each player’s ticket QR, or mark Arrived / Didn’t show on their avatar if they forgot.'
            : 'Find the organiser, open your session ticket, and show the QR so they can scan you in.'}
        </Text>

        <View style={styles.steps}>
          {(organiserView
            ? [
                'Open Scan check-in (or tap a player)',
                'Scan their QR, or Mark arrived / Didn’t show',
                'Then start fixtures when the lineup is in',
              ]
            : [
                'Find the organiser at the venue',
                'Open your ticket → show the check-in QR',
                'If you forget, they can mark you in manually',
              ]
          ).map((step, i) => (
            <View key={step} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {onOpenTicket && !organiserView ? (
          <Pressable style={styles.cta} onPress={onOpenTicket}>
            <Text style={styles.ctaText}>Open my ticket</Text>
          </Pressable>
        ) : null}
        {onOpenTicket && organiserView ? (
          <Pressable style={styles.cta} onPress={onOpenTicket}>
            <Text style={styles.ctaText}>Preview ticket</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', marginVertical: 6 },
  card: {
    borderRadius: radii.lg,
    backgroundColor: colors.elevated,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(200,255,46,0.35)',
    gap: 6,
  },
  botRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botMark: { fontFamily: 'Figtree_700Bold', fontSize: 10, color: '#0B0D10' },
  botName: { fontFamily: 'Figtree_700Bold', fontSize: 13, color: colors.accentGreen },
  kicker: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 11,
    letterSpacing: 0.9,
    color: colors.accentGreen,
  },
  title: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  sub: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  steps: { gap: 10, marginTop: 6 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accentGreenDim,
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 12,
    color: colors.accentGreen,
  },
  stepText: {
    flex: 1,
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  cta: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 15,
    color: '#0B0D10',
  },
});
