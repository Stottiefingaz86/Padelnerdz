import { colors, radii, spacing } from '@padel-nerdz/config';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatMoney, PLATFORM_FEE_CENTS, priceBreakdown } from '@/lib/pricing';
import type { MyRegistrationState } from '@/lib/sessions';

type Props = {
  title: string;
  startsAt: string;
  venue?: string | null;
  format?: string;
  registeredCount?: number;
  maxPlayers?: number;
  /** Court share only (organiser input) */
  priceCents?: number | null;
  /** Platform fee before IVA, defaults to PLATFORM_FEE_CENTS (€1) */
  commissionCents?: number | null;
  /** Prefer this when payload already has the player-facing total */
  playerTotalCents?: number | null;
  courts?: number;
  bannerUrl?: string | null;
  isOrganiser?: boolean;
  myState?: MyRegistrationState;
  hasSessionRoom?: boolean;
  lineupConfirmed?: boolean;
  onRegister: () => void;
  onPay: () => void;
  onSelectPlayers: () => void;
  onOpenSessionRoom: () => void;
  busy?: boolean;
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function playerFacingPrice(
  courtCents?: number | null,
  commissionCents?: number | null,
  playerTotalCents?: number | null,
) {
  if (playerTotalCents != null && playerTotalCents > 0) {
    return formatMoney(playerTotalCents);
  }
  if (courtCents == null) return null;
  return formatMoney(
    priceBreakdown(courtCents, commissionCents ?? PLATFORM_FEE_CENTS).playerTotalCents,
  );
}

export function MixinCard({
  title,
  startsAt,
  venue,
  format,
  registeredCount = 0,
  maxPlayers = 8,
  priceCents,
  commissionCents,
  playerTotalCents,
  courts,
  bannerUrl,
  isOrganiser,
  myState = 'none',
  hasSessionRoom,
  lineupConfirmed,
  onRegister,
  onPay,
  onSelectPlayers,
  onOpenSessionRoom,
  busy,
}: Props) {
  const price = playerFacingPrice(priceCents, commissionCents, playerTotalCents);
  const organiserNeedsLineup = Boolean(isOrganiser && !lineupConfirmed);

  let primaryLabel = 'Register interest';
  let primaryAction = onRegister;
  let primaryDisabled = false;
  let secondarySelf: { label: string; onPress: () => void; disabled?: boolean } | null = null;

  if (myState === 'paid') {
    primaryLabel = 'Open session chat';
    primaryAction = onOpenSessionRoom;
    primaryDisabled = false;
  } else if (myState === 'awaiting_verify') {
    primaryLabel = hasSessionRoom ? 'Open session chat' : 'Paid, waiting for organiser';
    primaryAction = hasSessionRoom ? onOpenSessionRoom : () => {};
    primaryDisabled = !hasSessionRoom;
  } else if (organiserNeedsLineup) {
    primaryLabel =
      registeredCount > 0
        ? `Confirm lineup · ${registeredCount} interested`
        : 'Confirm lineup';
    primaryAction = onSelectPlayers;
    primaryDisabled = false;
    if (myState === 'none') {
      secondarySelf = { label: 'I want to play', onPress: onRegister };
    } else if (myState === 'interested' || myState === 'waitlisted') {
      secondarySelf = { label: 'You’re interested', onPress: () => {}, disabled: true };
    } else if (myState === 'selected_pay') {
      secondarySelf = {
        label: price ? `Pay ${price}` : 'Pay to confirm',
        onPress: onPay,
      };
    }
  } else if (myState === 'interested') {
    primaryLabel = 'Interest registered';
    primaryDisabled = true;
  } else if (myState === 'waitlisted') {
    primaryLabel = 'On waitlist';
    primaryDisabled = true;
  } else if (myState === 'selected_pay') {
    primaryLabel = price ? `Pay ${price} to confirm` : 'Pay to confirm place';
    primaryAction = onPay;
  } else if (lineupConfirmed && myState === 'none') {
    primaryLabel = 'Lineup closed';
    primaryDisabled = true;
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.card, organiserNeedsLineup && styles.cardOrganiser]}>
        {bannerUrl ? <Image source={{ uri: bannerUrl }} style={styles.banner} /> : null}
        <View style={styles.botRow}>
          <View style={styles.botAvatar}>
            <Text style={styles.botMark}>PN</Text>
          </View>
          <Text style={styles.botName}>Padel Nerdz</Text>
          {organiserNeedsLineup ? (
            <View style={styles.adminPill}>
              <Text style={styles.adminPillText}>ADMIN</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.kicker}>
          {myState === 'paid'
            ? 'PLACE CONFIRMED'
            : lineupConfirmed
              ? 'LINEUP CONFIRMED'
              : 'MIX-IN OPEN'}
        </Text>
        <Text style={styles.title}>{title}</Text>

        <View style={styles.metaBlock}>
          <Text style={styles.meta}>{formatWhen(startsAt)}</Text>
          {venue ? <Text style={styles.meta}>{venue}</Text> : null}
          <Text style={styles.meta}>
            {[
              format ? format.split('_').join(' ') : null,
              courts ? `${courts} court${courts === 1 ? '' : 's'}` : null,
              `${registeredCount} interested · max ${maxPlayers}`,
              price,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>

        <Pressable
          onPress={primaryAction}
          disabled={primaryDisabled || busy}
          style={[
            styles.primaryBtn,
            organiserNeedsLineup && styles.primaryBtnOrganiser,
            (primaryDisabled || busy) && styles.btnDisabled,
          ]}
        >
          <Text style={styles.primaryBtnText}>{busy ? '…' : primaryLabel}</Text>
        </Pressable>

        {secondarySelf && myState !== 'paid' ? (
          <Pressable
            onPress={secondarySelf.onPress}
            disabled={secondarySelf.disabled || busy}
            style={[styles.secondaryBtn, (secondarySelf.disabled || busy) && styles.btnDisabled]}
          >
            <Text style={styles.secondaryBtnText}>{secondarySelf.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    marginVertical: 6,
  },
  card: {
    borderRadius: radii.lg,
    backgroundColor: colors.elevated,
    padding: spacing.md,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  cardOrganiser: {
    borderColor: 'rgba(200,255,46,0.45)',
    borderWidth: 1.5,
  },
  banner: {
    marginHorizontal: -spacing.md,
    marginTop: -spacing.md,
    marginBottom: 10,
    height: 120,
    width: 'auto',
  },
  botRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botMark: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 10,
    color: '#0B0D10',
  },
  botName: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 13,
    color: colors.accentGreen,
    flex: 1,
  },
  adminPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.accentGreenDim,
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.4)',
  },
  adminPillText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.accentGreen,
  },
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
    marginTop: 2,
  },
  metaBlock: {
    gap: 2,
    marginTop: 4,
    marginBottom: 10,
  },
  meta: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  primaryBtn: {
    backgroundColor: colors.accentGreen,
    borderRadius: radii.pill,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnOrganiser: {
    minHeight: 52,
  },
  primaryBtnText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 15,
    color: '#0B0D10',
  },
  secondaryBtn: {
    marginTop: 8,
    minHeight: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentGreenDim,
    borderWidth: 1.5,
    borderColor: 'rgba(200,255,46,0.45)',
  },
  secondaryBtnText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 14,
    color: colors.accentGreen,
  },
  btnDisabled: { opacity: 0.55 },
});
