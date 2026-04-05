import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTransitiveGraphStream, getPackageDetails, getTransitiveDepths, getTransitiveLibyearsBreakdown } from '../services/api';
import type { StreamProgressEvent, PackageDetailsResponse } from '../types/api';

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

export function usePackageDetailsQuery({ ecosystem, packageName, version }: UseGraphQueryParams) {
  return useQuery<PackageDetailsResponse, Error>({
    queryKey: ['packageDetails', ecosystem, packageName, version],
    queryFn: () => getPackageDetails(ecosystem!, packageName!, version!),
    enabled: !!ecosystem && !!packageName && !!version,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePackageDepthsQuery({ ecosystem, packageName, version }: UseGraphQueryParams) {
  return useQuery<Record<string, number>, Error>({
    queryKey: ['packageDepths', ecosystem, packageName, version],
    queryFn: () => getTransitiveDepths(ecosystem!, packageName!, version!),
    enabled: !!ecosystem && !!packageName && !!version,
    staleTime: Infinity,
  });
}

export function usePackageLibyearsQuery({ ecosystem, packageName, version }: UseGraphQueryParams) {
  return useQuery<Record<string, number>, Error>({
    queryKey: ['packageLibyears', ecosystem, packageName, version],
    queryFn: () => getTransitiveLibyearsBreakdown(ecosystem!, packageName!, version!),
    enabled: !!ecosystem && !!packageName && !!version,
    staleTime: Infinity,
  });
}
