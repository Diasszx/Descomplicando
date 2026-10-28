import { apiClient } from '@/lib/api-client';
import type { CreateSponsorInput, SponsorResponse } from '@fono/shared';

export const sponsorService = {
  async create(data: CreateSponsorInput): Promise<SponsorResponse> {
    const response = await apiClient.post<SponsorResponse>('/sponsors', data);
    return response.data;
  },

  async getAll(): Promise<SponsorResponse[]> {
    const response = await apiClient.get<SponsorResponse[]>('/sponsors');
    return response.data;
  },
};
