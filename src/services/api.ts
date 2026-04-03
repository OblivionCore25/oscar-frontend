import axios from 'axios';
import type { PackageDetailsResponse, TransitiveGraphResponse, TopRiskResponse, CoverageResponse, IngestedPackagesResponse } from '../types/api';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_OSCAR_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getPackageDetails = async (
  ecosystem: string,
  packageName: string,
  version: string
): Promise<PackageDetailsResponse> => {
  const response = await apiClient.get<PackageDetailsResponse>(
    `/packages/${ecosystem}/${encodeURIComponent(packageName)}/${encodeURIComponent(version)}`
  );
  return response.data;
};

export const getTransitiveGraph = async (
  ecosystem: string,
  packageName: string,
  version: string,
): Promise<TransitiveGraphResponse> => {
  const response = await apiClient.get<TransitiveGraphResponse>(
    `/dependencies/${ecosystem}/${encodeURIComponent(packageName)}/${encodeURIComponent(version)}/transitive`
  );
  return response.data;
};

export const getTopRisk = async (ecosystem: string = 'npm', limit: number = 50): Promise<TopRiskResponse> => {
  const response = await apiClient.get<TopRiskResponse>(`/analytics/top-risk`, {
    params: { ecosystem, limit }
  });
  return response.data;
};

export const getCoverage = async (ecosystem: string = 'npm'): Promise<CoverageResponse> => {
  const response = await apiClient.get<CoverageResponse>('/analytics/coverage', {
    params: { ecosystem }
  });
  return response.data;
};

export const getIngestedPackages = async (
  ecosystem: string = 'npm',
  q: string = '',
  limit: number = 200,
): Promise<IngestedPackagesResponse> => {
  const response = await apiClient.get<IngestedPackagesResponse>('/packages', {
    params: { ecosystem, q: q || undefined, limit },
  });
  return response.data;
};

