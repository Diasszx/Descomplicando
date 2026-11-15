import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useHealth } from '../hooks/use-health';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export function HealthStatusCard() {
  const { data, isLoading, isError, error, refetch, isFetching } = useHealth();

  if (isLoading) {
    return (
      <View style={[styles.card, styles.center]} accessibilityLabel="Carregando status do sistema">
        <ActivityIndicator size="small" color={colors.brand.teal} />
        <Text style={styles.loadingText}>Conectando ao servidor...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View
        style={[styles.card, styles.errorCard]}
        accessible={true}
        accessibilityRole="alert"
        accessibilityLabel={`Erro de conexão: ${error?.message || 'Falha ao buscar status'}`}
      >
        <Text style={styles.errorTitle}>Falha na Conexão</Text>
        <Text style={styles.errorText}>
          {error?.message || 'Não foi possível alcançar a API do Projeto Fono.'}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => refetch()}
          disabled={isFetching}
          accessibilityRole="button"
          accessibilityLabel="Tentar novamente"
        >
          <Text style={styles.retryButtonText}>
            {isFetching ? 'Tentando...' : 'Tentar novamente'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyText}>Nenhum dado retornado.</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.card, styles.successCard]}
      accessible={true}
      accessibilityLabel={`Status do sistema: ${data.status}. Serviço: ${data.service}. Versão: ${data.version}.`}
    >
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>Status do Sistema</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{data.status.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.label}>Serviço:</Text>
        <Text style={styles.value}>{data.service}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.label}>Versão:</Text>
        <Text style={styles.value}>{data.version}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    padding: spacing.lg,
    width: '100%',
    shadowColor: colors.shadow.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginVertical: spacing.md,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.mutedForeground,
    fontSize: typography.fontSize.base,
  },
  errorCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.destructive,
  },
  errorTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: 'bold',
    color: colors.status.error,
    marginBottom: spacing.xs,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    color: colors.status.errorForeground,
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.brand.teal,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: colors.brand.tealForeground,
    fontWeight: '600',
    fontSize: typography.fontSize.sm,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontStyle: 'italic',
  },
  successCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.status.success,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: 'bold',
    color: colors.cardForeground,
  },
  badge: {
    backgroundColor: colors.status.successSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  badgeText: {
    color: colors.status.successForeground,
    fontSize: typography.fontSize.xs,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  label: {
    color: colors.mutedForeground,
    fontSize: typography.fontSize.base,
  },
  value: {
    color: colors.cardForeground,
    fontWeight: '500',
    fontSize: typography.fontSize.base,
  },
});
