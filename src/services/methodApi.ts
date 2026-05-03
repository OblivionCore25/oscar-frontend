import axios from 'axios';

const methodApiClient = axios.create({
  baseURL: import.meta.env.VITE_OSCAR_METHOD_API_URL || 'http://localhost:8001',
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface IngestResponse {
  project_slug: string;
  message: string;
  is_meta_package: boolean;
  resolved_core_slug: string | null;
  meta_dependencies: string[];
}

export const ingestPackageMethod = async (
  ecosystem: string,
  packageName: string
): Promise<IngestResponse> => {
  const response = await methodApiClient.post<IngestResponse>(
    `/methods/ingest/${ecosystem}/${encodeURIComponent(packageName)}`
  );
  return response.data;
};
