import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sponsorService } from '../services/sponsor.service';
import type { CreateSponsorInput, SponsorResponse } from '@fono/shared';

export const SPONSORS_QUERY_KEY = ['sponsors'] as const;

export function useCreateSponsor() {
  const queryClient = useQueryClient();

  return useMutation<SponsorResponse, Error, CreateSponsorInput>({
    mutationFn: (data: CreateSponsorInput) => sponsorService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SPONSORS_QUERY_KEY });
    },
  });
}
