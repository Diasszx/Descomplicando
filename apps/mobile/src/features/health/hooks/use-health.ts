import { useQuery } from '@tanstack/react-query';
import { HealthResponseSchema, HealthResponse } from '@fono/shared';
import { apiClient } from '@/lib/api-client';

export function useHealth() {
  return useQuery<HealthResponse, Error>({
    queryKey: ['mobile-health'],
    queryFn: async () => {
      const response = await apiClient.get('/health');
      return HealthResponseSchema.parse(response.data);
    },
  });
}
