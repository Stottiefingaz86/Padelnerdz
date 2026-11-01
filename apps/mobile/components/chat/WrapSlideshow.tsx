import { colors, spacing } from '@padel-nerdz/config';
import { Pause, Share2, Volume2, VolumeX, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { tap } from '@/lib/feedback';
import type { WrapSlide } from '@/lib/wrap';

type Props = {
  slides: WrapSlide[];
  sessionTitle?: string;
  onClose: () => void;
};

const { width: W, height: H } = Dimensions.get('window');
const SLIDE_MS = 5000;
const LIME = colors.accentGreen;
const INK = '#0B0D10';

export function WrapSlideshow({ slides, sessionTitle, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const musicRef = useRef<{ pause: () => void; play: () => void; remove: () => void } | null>(
    null,
  );
  const indexRef = useRef(0);
  indexRef.current = index;

  const slide = slides[index];
  const isFinale = slide?.kind === 'finale';
  const limeSlide = index % 2 === 1;

  const goTo = useCallback(
    (next: number) => {
      if (next < 0) return;
      if (next >= slides.length) {
        onClose();
        return;
      }
      setIndex(next);
    },
    [onClose, slides.length],
  );

  const goNext = useCallback(() => goTo(indexRef.current + 1), [goTo]);
  const goPrev = useCallback(() => {
    if (indexRef.current <= 0) {
      progress.setValue(0);
      return;
    }
    goTo(indexRef.current - 1);
  }, [goTo, progress]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const audio = await import('expo-audio');
        await audio.setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionMode: 'mixWithOthers',
        });
        const player = audio.createAudioPlayer(
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require('../../assets/sounds/wrap-loop.wav'),
        );
        player.loop = true;
        player.volume = 0.28;
        if (cancelled) {
          player.remove();
          return;
        }
        musicRef.current = player;
        if (!muted) player.play();
      } catch {
        /* no music */
      }
    })();
    return () => {
      cancelled = true;
      try {
        musicRef.current?.pause();
        musicRef.current?.remove();
      } catch {
        /* */
      }
      musicRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  useEffect(() => {
    const p = musicRef.current;
    if (!p) return;
    try {
      if (muted || paused) p.pause();
      else p.play();
    } catch {
      /* */
    }
  }, [muted, paused]);

  useEffect(() => {
    progress.setValue(0);
    animRef.current?.stop();
    if (paused || isFinale) return;

    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: SLIDE_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animRef.current = anim;
    anim.start(({ finished }) => {
      if (finished) goNext();
    });
    return () => anim.stop();
  }, [index, paused, isFinale, progress, goNext]);

  async function onShare() {
    void tap();
    const title = sessionTitle || (slide?.kind === 'finale' ? slide.subtitle : 'Session wrap');
    const lines = [
      `Padel Nerdz wrap · ${title}`,
      slide?.kind === 'finale'
        ? `${slide.playerCount} players · ${slide.matchCount} matches · ${slide.photoCount} photos`
        : 'Session highlights from our mix-in.',
    ];
    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      /* cancelled */
    }
  }

  const inkOnLime = limeSlide;
  const fg = inkOnLime ? INK : colors.textPrimary;
  const mutedFg = inkOnLime ? 'rgba(11,13,16,0.65)' : colors.textSecondary;
  const accent = inkOnLime ? INK : LIME;

  return (
    <View style={[styles.root, { backgroundColor: limeSlide ? LIME : INK }]}>
      <BrandChrome lime={limeSlide} />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.progressRow}>
          {slides.map((s, i) => (
            <View
              key={s.id}
              style={[
                styles.progressTrack,
                { backgroundColor: inkOnLime ? 'rgba(11,13,16,0.25)' : 'rgba(255,255,255,0.22)' },
              ]}
            >
              {i < index ? (
                <View
                  style={[
                    styles.progressFill,
                    { width: '100%', backgroundColor: inkOnLime ? INK : '#fff' },
                  ]}
                />
              ) : null}
              {i === index ? (
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: inkOnLime ? INK : '#fff',
                      width: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              ) : null}
            </View>
          ))}
        </View>
        <View style={styles.topActions}>
          <Pressable
            onPress={() => {
              void tap();
              setMuted((m) => !m);
            }}
            hitSlop={10}
            style={[
              styles.iconBtn,
              { backgroundColor: inkOnLime ? 'rgba(11,13,16,0.12)' : 'rgba(255,255,255,0.1)' },
            ]}
            accessibilityLabel={muted ? 'Unmute' : 'Mute'}
          >
            <Icon icon={muted ? VolumeX : Volume2} color={fg} size="sm" />
          </Pressable>
          <Pressable
            onPress={() => {
              void tap();
              onClose();
            }}
            hitSlop={10}
            style={[
              styles.iconBtn,
              { backgroundColor: inkOnLime ? 'rgba(11,13,16,0.12)' : 'rgba(255,255,255,0.1)' },
            ]}
            accessibilityLabel="Close"
          >
            <Icon icon={X} color={fg} size="sm" />
          </Pressable>
        </View>
      </View>

      <View style={[styles.page, { paddingBottom: insets.bottom + 28 }]}>
        <SlideBody
          slide={slide}
          accent={accent}
          fg={fg}
          mutedFg={mutedFg}
          limeSurface={limeSlide}
          onShare={onShare}
        />
      </View>

      <View
        style={[
          styles.tapZones,
          {
            top: insets.top + 56,
            bottom: isFinale ? insets.bottom + 100 : 0,
          },
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          style={styles.tapLeft}
          onPress={() => {
            void tap();
            goPrev();
          }}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
          delayLongPress={180}
        />
        <Pressable
          style={styles.tapRight}
          onPress={() => {
            void tap();
            goNext();
          }}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
          delayLongPress={180}
        />
      </View>

      {paused ? (
        <View style={styles.pauseBadge} pointerEvents="none">
          <Icon icon={Pause} color="#fff" size="sm" />
        </View>
      ) : null}
    </View>
  );
}

/** Static brand blocks + crown — no drifting blobs. */
function BrandChrome({ lime }: { lime: boolean }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {!lime ? (
        <>
          <View style={styles.blockTop} />
          <View style={styles.blockSide} />
        </>
      ) : (
        <View style={styles.blockInkCorner} />
      )}
      {!lime ? (
        <Image
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          source={require('../../assets/brand/crown.png')}
          style={styles.crownMark}
          resizeMode="contain"
        />
      ) : null}
    </View>
  );
}

function SlideBody({
  slide,
  accent,
  fg,
  mutedFg,
  limeSurface,
  onShare,
}: {
  slide: WrapSlide | undefined;
  accent: string;
  fg: string;
  mutedFg: string;
  limeSurface: boolean;
  onShare: () => void;
}) {
  if (!slide) return null;

  const panelBg = limeSurface ? 'rgba(11,13,16,0.1)' : 'rgba(200,255,46,0.08)';
  const panelBorder = limeSurface ? 'rgba(11,13,16,0.2)' : 'rgba(200,255,46,0.35)';

  if (slide.kind === 'cover') {
    return (
      <View style={styles.cover}>
        <Text style={[styles.kicker, { color: accent }]}>{slide.subtitle}</Text>
        <Text style={[styles.heroTitle, { color: fg }]}>{slide.title}</Text>
        <Text style={[styles.heroMeta, { color: mutedFg }]}>{slide.when}</Text>
        {slide.venue ? (
          <Text style={[styles.heroMeta, { color: mutedFg }]}>{slide.venue}</Text>
        ) : null}
        {slide.format ? (
          <View style={[styles.formatBlock, { borderColor: accent }]}>
            <Text style={[styles.formatText, { color: accent }]}>
              {slide.format.split('_').join(' ')}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  if (slide.kind === 'squad') {
    return (
      <View style={styles.block}>
        <Text style={[styles.kicker, { color: accent }]}>The squad</Text>
        <Text style={[styles.blockTitle, { color: fg }]}>{slide.title}</Text>
        <View style={styles.squadList}>
          {slide.players.map((p) => (
            <View
              key={p.name}
              style={[styles.squadRow, { backgroundColor: panelBg, borderColor: panelBorder }]}
            >
              <View style={[styles.avatar, { backgroundColor: accent }]}>
                <Text style={[styles.avatarText, { color: limeSurface ? LIME : INK }]}>
                  {p.name.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.squadName, { color: fg }]}>{p.name}</Text>
              {p.reliability != null ? (
                <Text style={[styles.squadMeta, { color: accent }]}>{p.reliability}%</Text>
              ) : null}
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (slide.kind === 'fixtures') {
    return (
      <View style={styles.block}>
        <Text style={[styles.kicker, { color: accent }]}>Fixtures</Text>
        <Text style={[styles.blockTitle, { color: fg }]}>{slide.title}</Text>
        <View style={styles.matchList}>
          {slide.matches.map((m) => (
            <View
              key={`${m.label}-${m.teamA}`}
              style={[styles.matchCard, { backgroundColor: panelBg, borderColor: panelBorder }]}
            >
              <Text style={[styles.matchLabel, { color: accent }]}>{m.label}</Text>
              <Text style={[styles.matchTeam, { color: fg }]}>{m.teamA}</Text>
              <Text style={[styles.matchVs, { color: mutedFg }]}>vs</Text>
              <Text style={[styles.matchTeam, { color: fg }]}>{m.teamB}</Text>
              {m.score ? (
                <Text style={[styles.matchScore, { color: accent }]}>{m.score}</Text>
              ) : null}
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (slide.kind === 'photo') {
    return (
      <View style={styles.photoSlide}>
        <Image source={{ uri: slide.uri }} style={styles.photo} resizeMode="cover" />
        <View style={styles.photoCaption}>
          <Text style={[styles.kicker, { color: accent }]}>
            {slide.caption ?? 'From the chat'}
          </Text>
          <Text style={[styles.blockTitle, { color: fg }]}>{slide.title}</Text>
        </View>
      </View>
    );
  }

  if (slide.kind === 'chat_shared') {
    return (
      <View style={styles.block}>
        <Text style={[styles.kicker, { color: accent }]}>{slide.title}</Text>
        <Text style={[styles.blockTitle, { color: fg }]}>{slide.subtitle}</Text>
        {slide.photos.length > 0 ? (
          <View style={styles.collage}>
            {slide.photos.slice(0, 6).map((p, i) => (
              <Image
                key={`${p.uri}-${i}`}
                source={{ uri: p.uri }}
                style={[
                  styles.collageTile,
                  slide.photos.length === 1 && styles.collageTileSolo,
                ]}
                resizeMode="cover"
              />
            ))}
          </View>
        ) : null}
        {slide.quotes.slice(0, 2).map((q) => (
          <View
            key={`${q.sender}-${q.body.slice(0, 12)}`}
            style={[styles.quoteCard, { backgroundColor: panelBg, borderColor: panelBorder }]}
          >
            <Text style={[styles.quoteCardBody, { color: fg }]}>“{q.body}”</Text>
            <Text style={[styles.quoteCardSender, { color: accent }]}>— {q.sender}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (slide.kind === 'quote') {
    return (
      <View style={styles.quoteSlide}>
        <Text style={[styles.kicker, { color: accent }]}>{slide.title}</Text>
        <Text style={[styles.quoteBody, { color: fg }]}>“{slide.body}”</Text>
        <Text style={[styles.quoteSender, { color: accent }]}>— {slide.sender}</Text>
      </View>
    );
  }

  if (slide.kind === 'finale') {
    return (
      <View style={styles.finale}>
        <Text style={[styles.kicker, { color: accent }]}>Padel Nerdz</Text>
        <Text style={[styles.heroTitle, { color: fg }]}>{slide.title}</Text>
        <Text style={[styles.heroMeta, { color: mutedFg }]}>{slide.subtitle}</Text>
        <View style={styles.statRow}>
          {[
            { v: slide.playerCount, l: 'Players' },
            { v: slide.matchCount, l: 'Matches' },
            { v: slide.photoCount, l: 'Photos' },
          ].map((s) => (
            <View
              key={s.l}
              style={[styles.stat, { backgroundColor: panelBg, borderColor: panelBorder }]}
            >
              <Text style={[styles.statValue, { color: accent }]}>{s.v}</Text>
              <Text style={[styles.statLabel, { color: mutedFg }]}>{s.l}</Text>
            </View>
          ))}
        </View>
        <Pressable
          style={[styles.shareBtn, { backgroundColor: limeSurface ? INK : LIME }]}
          onPress={onShare}
        >
          <Icon icon={Share2} color={limeSurface ? LIME : INK} size="sm" />
          <Text style={[styles.shareBtnText, { color: limeSurface ? LIME : INK }]}>
            Share wrap
          </Text>
        </Pressable>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  blockTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: LIME,
  },
  blockSide: {
    position: 'absolute',
    top: '28%',
    right: 0,
    width: 10,
    height: 120,
    backgroundColor: LIME,
  },
  blockInkCorner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 72,
    height: 72,
    backgroundColor: INK,
  },
  crownMark: {
    position: 'absolute',
    bottom: 36,
    right: 20,
    width: 72,
    height: 72,
    opacity: 0.5,
    mixBlendMode: 'screen',
  },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: spacing.md,
    gap: 10,
  },
  progressRow: { flexDirection: 'row', gap: 4 },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapZones: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    zIndex: 10,
  },
  page: {
    flex: 1,
    width: W,
    paddingHorizontal: spacing.lg,
    paddingTop: 96,
    justifyContent: 'center',
    zIndex: 5,
  },
  tapLeft: { flex: 1 },
  tapRight: { flex: 1 },
  pauseBadge: {
    position: 'absolute',
    alignSelf: 'center',
    top: '46%',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  cover: { gap: 12 },
  kicker: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 40,
    lineHeight: 44,
  },
  heroMeta: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 17,
    lineHeight: 24,
  },
  formatBlock: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 2,
  },
  formatText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 13,
    textTransform: 'capitalize',
  },
  block: { gap: 12 },
  blockTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 30,
    lineHeight: 34,
  },
  squadList: { gap: 10, marginTop: 8 },
  squadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 16,
  },
  squadName: {
    flex: 1,
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 17,
  },
  squadMeta: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 13,
  },
  matchList: { gap: 10, marginTop: 8 },
  matchCard: {
    padding: 14,
    borderWidth: 1,
    gap: 4,
  },
  matchLabel: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  matchTeam: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 16,
  },
  matchVs: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 12,
    marginVertical: 2,
  },
  matchScore: {
    marginTop: 6,
    fontFamily: 'Figtree_700Bold',
    fontSize: 18,
  },
  photoSlide: { flex: 1, justifyContent: 'center', gap: 16 },
  photo: {
    width: '100%',
    height: H * 0.48,
    backgroundColor: colors.elevated,
  },
  photoCaption: { gap: 6 },
  collage: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  collageTile: {
    width: (W - spacing.lg * 2 - 12) / 3,
    height: (W - spacing.lg * 2 - 12) / 3,
    backgroundColor: colors.elevated,
  },
  collageTileSolo: {
    width: '100%',
    height: H * 0.32,
  },
  quoteCard: {
    marginTop: 8,
    padding: 14,
    borderWidth: 1,
    gap: 6,
  },
  quoteCardBody: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
  },
  quoteCardSender: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 13,
  },
  quoteSlide: { gap: 18 },
  quoteBody: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 30,
    lineHeight: 38,
  },
  quoteSender: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 16,
  },
  finale: { gap: 14 },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  stat: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 28,
  },
  statLabel: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 12,
  },
  shareBtn: {
    marginTop: 20,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareBtnText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 16,
  },
});
