import { View, Text, StyleSheet } from 'react-native';
import { HealthStatusCard } from '@/features/health/components/health-status-card';

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
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
});
