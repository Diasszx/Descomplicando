import { View, Text, StyleSheet } from 'react-native';
import { HealthStatusCard } from '@/features/health/components/health-status-card';
import { colors, spacing, typography } from '@/theme/tokens';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text
        style={styles.title}
        accessible={true}
        accessibilityRole="header"
        accessibilityLabel="Título: Projeto Fono Mobile"
      >
        Projeto Fono — Mobile
      </Text>
      <Text style={styles.subtitle}>
        Acompanhamento e exercícios fonoaudiológicos na palma da mão.
      </Text>
      <HealthStatusCard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    color: colors.foreground,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});
