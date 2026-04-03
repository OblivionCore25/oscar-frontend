import { useQuery } from '@tanstack/react-query';
import { getIngestedPackages } from '../services/api';

/**
 * Fetches the list of packages already stored in the observatory DB.
 * Cached indefinitely — the list only grows, never shrinks during a session.
 * Optionally filter by name prefix with `q`.
 */
export function useIngestedPackages(ecosystem: string, q: string = '') {
  return useQuery({
    queryKey: ['ingested-packages', ecosystem, q],
    queryFn: () => getIngestedPackages(ecosystem, q, 200),
    staleTime: 30_000, // Re-fetch every 30s to pick up newly ingested packages
    placeholderData: (prev) => prev, // keep old list while re-fetching
  });
}
