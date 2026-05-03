import { useQuery } from '@tanstack/react-query';
import { getEnrichment } from '../services/api';
import type { EnrichmentResponse } from '../types/api';

export function useEnrichment(ecosystem: string, packageName: string, version: string) {
  return useQuery<EnrichmentResponse, Error>({
    queryKey: ['enrichment', ecosystem, packageName, version],
    queryFn: () => getEnrichment(ecosystem, packageName, version),
    enabled: !!(ecosystem && packageName && version),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}
