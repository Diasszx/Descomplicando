import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useHealth } from '../hooks/use-health';

export function HealthStatusCard() {
  const { data, isLoading, isError, error, refetch, isFetching } = useHealth();

  if (isLoading) {
    return (
      <View style={[styles.card, styles.center]} accessibilityLabel="Carregando status do sistema">
        <ActivityIndicator size="small" color="#0d9488" />
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
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginVertical: 12,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 14,
  },
  errorCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#7f1d1d',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#0d9488',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyText: {
    color: '#64748b',
    fontStyle: 'italic',
  },
  successCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  badge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#065f46',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  label: {
    color: '#64748b',
    fontSize: 14,
  },
  value: {
    color: '#0f172a',
    fontWeight: '500',
    fontSize: 14,
  },
});
