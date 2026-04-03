import axios from 'axios';
import type { PackageDetailsResponse, TransitiveGraphResponse, TopRiskResponse, CoverageResponse, IngestedPackagesResponse, StreamProgressEvent } from '../types/api';

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

export const getTransitiveGraphStream = async (
  ecosystem: string,
  packageName: string,
  version: string,
  onProgress: (event: StreamProgressEvent) => void
): Promise<TransitiveGraphResponse> => {
  const url = `${import.meta.env.VITE_OSCAR_API_URL}/dependencies/${ecosystem}/${encodeURIComponent(packageName)}/${encodeURIComponent(version)}/transitive`;
  
  const response = await fetch(url);
  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errorBody = await response.json();
      errorDetail = errorBody.detail || errorDetail;
    } catch (e) { /* ignore */ }
    throw new Error(errorDetail);
  }
  
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Streaming not supported in this environment');
  }
  
  const decoder = new TextDecoder();
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';
    
    for (const part of parts) {
      if (part.startsWith('data: ')) {
        try {
          const data = JSON.parse(part.substring(6));
          if (data.type === 'progress') {
            onProgress(data);
          } else if (data.type === 'complete') {
            return data.data;
          } else if (data.type === 'error') {
            throw new Error(data.message);
          }
        } catch (e) {
          console.error("Failed to parse stream event chunk", part, e);
        }
      }
    }
  }
  throw new Error("Stream ended without completion event");
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

