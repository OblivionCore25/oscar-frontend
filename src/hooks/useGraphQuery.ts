import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTransitiveGraphStream } from '../services/api';
import type { StreamProgressEvent } from '../types/api';

interface UseGraphQueryParams {
  ecosystem: string | null;
  packageName: string | null;
  version: string | null;
}

export function useGraphQuery({
  ecosystem,
  packageName,
  version,
}: UseGraphQueryParams) {
  const [progress, setProgress] = useState<StreamProgressEvent | null>(null);

  const query = useQuery({
    queryKey: ['transitive-graph', ecosystem, packageName, version],
    queryFn: () => {
      setProgress(null);
      return getTransitiveGraphStream(ecosystem!, packageName!, version!, setProgress);
    },
    enabled: !!ecosystem && !!packageName && !!version,
    staleTime: Infinity, // Graphs are mathematically immutable once published.
    retry: false,
  });

  return { ...query, progress };
}
