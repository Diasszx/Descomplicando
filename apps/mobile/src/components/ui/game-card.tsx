import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { GameCategoryTheme } from '@fono/shared';
import { radius, spacing, typography, useThemeColors } from '@/theme/tokens';

export interface GameCardProps {
  title: string;
  itemsCount: number;
  unitLabel?: string;
  theme?: GameCategoryTheme;
  difficultyBadge?: string;
  onPlay?: () => void;
}

export function GameCard({
  title,
  itemsCount,
  unitLabel = 'Exercícios',
  theme = 'blue',
  difficultyBadge,
  onPlay,
}: GameCardProps) {
  const palette = useThemeColors();
  const gameTheme = palette.game[theme];

  return (
    <Pressable
      onPress={onPlay}
      accessibilityRole="button"
      accessibilityLabel={`Iniciar ${title}, ${itemsCount} ${unitLabel}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: palette.card,
          borderColor: palette.border,
          shadowColor: palette.shadow.color,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={[styles.banner, { backgroundColor: gameTheme.from }]}>
        {difficultyBadge ? (
          <View style={[styles.badge, { backgroundColor: palette.card }]}>
            <Text style={[styles.badgeText, { color: palette.cardForeground }]}>
              {difficultyBadge}
            </Text>
          </View>
        ) : null}

        <View style={[styles.avatarCircle, { backgroundColor: palette.primaryForeground + '33' }]}>
          <Text style={[styles.avatarLetter, { color: palette.primaryForeground }]}>
            {title.charAt(0)}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text
          numberOfLines={1}
          style={[styles.title, { color: palette.cardForeground }]}
        >
          {title}
        </Text>

        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: palette.mutedForeground }]}>
            {itemsCount} {unitLabel}
          </Text>

          <View style={[styles.playButton, { backgroundColor: palette.brand.teal }]}>
            <Text style={[styles.playIcon, { color: palette.brand.tealForeground }]}>▶</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  banner: {
    height: 128,
    borderRadius: radius.banner,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
  },
  footer: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.md,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },
  playButton: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 11,
    marginLeft: 2,
  },
});
