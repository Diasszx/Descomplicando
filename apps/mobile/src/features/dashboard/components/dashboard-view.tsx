import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { GameCategoryTheme } from '@fono/shared';
import { GameCard } from '@/components/ui/game-card';
import { HealthStatusCard } from '@/features/health/components/health-status-card';
import { radius, spacing, typography, useThemeColors } from '@/theme/tokens';

interface LessonGame {
  id: string;
  title: string;
  itemsCount: number;
  unitLabel: string;
  theme: GameCategoryTheme;
  difficultyBadge: string;
}

interface KpiItem {
  id: string;
  value: string;
  label: string;
  theme: GameCategoryTheme;
  symbol: string;
}

const KPI_ITEMS: KpiItem[] = [
  { id: 'in-progress', value: '1', label: 'Lesson(s) in progress', theme: 'rose', symbol: '▶' },
  { id: 'completed', value: '10', label: 'Lessons completed', theme: 'emerald', symbol: '✓' },
  { id: 'categories', value: '4', label: 'Categories completed', theme: 'purple', symbol: '⊞' },
  { id: 'achievements', value: '5', label: 'Achievements', theme: 'amber', symbol: '★' },
];

const SAMPLE_GAMES: LessonGame[] = [
  {
    id: '1',
    title: 'A-E-I-O-U (Vogais)',
    itemsCount: 10,
    unitLabel: 'Exercícios',
    theme: 'rose',
    difficultyBadge: 'Nível Fácil',
  },
  {
    id: '2',
    title: 'Identificação de Sons e Cores',
    itemsCount: 8,
    unitLabel: 'Vídeos',
    theme: 'amber',
    difficultyBadge: 'Nível Fácil',
  },
  {
    id: '3',
    title: 'Raciocínio & Números Sonoros',
    itemsCount: 12,
    unitLabel: 'Desafios',
    theme: 'blue',
    difficultyBadge: 'Nível Médio',
  },
  {
    id: '4',
    title: 'Super Formas e Percepção',
    itemsCount: 6,
    unitLabel: 'Exercícios',
    theme: 'purple',
    difficultyBadge: 'Nível Difícil',
  },
  {
    id: '5',
    title: 'Consciência Fonológica dos Animais',
    itemsCount: 9,
    unitLabel: 'Vídeos',
    theme: 'emerald',
    difficultyBadge: 'Nível Fácil',
  },
  {
    id: '6',
    title: 'Frutas e Articulação Vocal',
    itemsCount: 7,
    unitLabel: 'Exercícios',
    theme: 'rose',
    difficultyBadge: 'Nível Médio',
  },
  {
    id: '7',
    title: 'Expressões Faciais e Emoções',
    itemsCount: 11,
    unitLabel: 'Práticas',
    theme: 'purple',
    difficultyBadge: 'Nível Médio',
  },
  {
    id: '8',
    title: 'Motricidade Orofacial & Respiração',
    itemsCount: 14,
    unitLabel: 'Exercícios',
    theme: 'blue',
    difficultyBadge: 'Nível Difícil',
  },
];

export function DashboardView() {
  const palette = useThemeColors();
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: palette.foreground }]}
          >
            Overview
          </Text>
          <Text style={[styles.subtitle, { color: palette.mutedForeground }]}>
            Acompanhamento de desempenho e catálogo de jogos fonoaudiológicos.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notificações: 1 não lida"
          style={[
            styles.notificationButton,
            { backgroundColor: palette.card, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.notificationLabel, { color: palette.foreground }]}>Alertas</Text>
          <View style={[styles.notificationBadge, { backgroundColor: palette.game.rose.from }]}>
            <Text style={[styles.notificationCount, { color: palette.primaryForeground }]}>1</Text>
          </View>
        </Pressable>
      </View>

      {/* Feedback de seleção */}
      {selectedGame ? (
        <View
          accessibilityRole="alert"
          style={[
            styles.feedbackBanner,
            { backgroundColor: palette.accent, borderColor: palette.primary },
          ]}
        >
          <Text style={[styles.feedbackText, { color: palette.accentForeground }]}>
            Jogo selecionado: {selectedGame}
          </Text>
        </View>
      ) : null}

      {/* KPIs */}
      <View style={styles.kpiGrid}>
        {KPI_ITEMS.map((kpi) => {
          const kpiTheme = palette.game[kpi.theme];
          return (
            <View
              key={kpi.id}
              style={[
                styles.kpiCard,
                { backgroundColor: palette.card, borderColor: palette.border },
              ]}
            >
              <View style={styles.kpiTop}>
                <Text style={[styles.kpiValue, { color: palette.foreground }]}>{kpi.value}</Text>
                <View style={[styles.kpiIconBox, { backgroundColor: kpiTheme.subtle }]}>
                  <Text style={[styles.kpiIconText, { color: kpiTheme.foreground }]}>
                    {kpi.symbol}
                  </Text>
                </View>
              </View>
              <Text style={[styles.kpiLabel, { color: palette.mutedForeground }]}>{kpi.label}</Text>
            </View>
          );
        })}
      </View>

      {/* Catálogo de Jogos */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: palette.foreground }]}>Lessons & Jogos</Text>
        <Text style={[styles.sectionSubtitle, { color: palette.mutedForeground }]}>
          Toque em um card para iniciar o exercício fonoaudiológico.
        </Text>
      </View>

      <View style={styles.gamesList}>
        {SAMPLE_GAMES.map((game) => (
          <GameCard
            key={game.id}
            title={game.title}
            itemsCount={game.itemsCount}
            unitLabel={game.unitLabel}
            theme={game.theme}
            difficultyBadge={game.difficultyBadge}
            onPlay={() => setSelectedGame(game.title)}
          />
        ))}
      </View>

      {/* Status da API */}
      <View style={styles.healthSection}>
        <Text style={[styles.sectionTitle, { color: palette.foreground }]}>Conectividade</Text>
        <HealthStatusCard />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
    gap: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    lineHeight: 18,
  },
  notificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.banner,
    borderWidth: 1,
  },
  notificationLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  notificationBadge: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationCount: {
    fontSize: 11,
    fontWeight: '700',
  },
  feedbackBanner: {
    padding: spacing.md,
    borderRadius: radius.banner,
    borderWidth: 1,
  },
  feedbackText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  kpiCard: {
    width: '47.5%',
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  kpiTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '900',
  },
  kpiIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.banner,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIconText: {
    fontSize: typography.fontSize.md,
    fontWeight: '700',
  },
  kpiLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  sectionHeader: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: typography.fontSize.xs,
  },
  gamesList: {
    gap: spacing.lg,
  },
  healthSection: {
    gap: spacing.sm,
  },
});
