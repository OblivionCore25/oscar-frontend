/**
 * Reusable hooks for oscar-method-observatory API calls.
 * Extracted from ResearchConsole inline useQuery blocks for reuse
 * across ArchitectureTab and standalone Method pages.
 */

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const METHOD_API = import.meta.env.VITE_METHOD_API_URL || import.meta.env.VITE_OSCAR_METHOD_API_URL || 'http://localhost:8001';

/** Fetch project metadata (method_count, class_count, etc.) */
export function useMethodMeta(projectSlug: string, enabled = true) {
  return useQuery({
    queryKey: ['method-meta', projectSlug],
    queryFn: async () => {
      try {
        const { data } = await axios.get(`${METHOD_API}/methods/${projectSlug}`);
        return data;
      } catch {
        return null;
      }
    },
    enabled: enabled && !!projectSlug,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch method-level hotspots ranked by composite risk */
export function useMethodHotspots(projectSlug: string, limit = 50, enabled = true) {
  return useQuery<any[] | null>({
    queryKey: ['method-hotspots', projectSlug, limit],
    queryFn: async () => {
      try {
        const { data } = await axios.get(`${METHOD_API}/methods/${projectSlug}/hotspots?limit=${limit}`);
        return data as any[];
      } catch {
        return null;
      }
    },
    enabled: enabled && !!projectSlug,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch community detection results */
export function useMethodCommunities(projectSlug: string, enabled = true) {
  return useQuery<Record<string, any[]> | null>({
    queryKey: ['method-communities', projectSlug],
    queryFn: async () => {
      try {
        const { data } = await axios.get(`${METHOD_API}/methods/${projectSlug}/communities`);
        return data as Record<string, any[]>;
      } catch {
        return null;
      }
    },
    enabled: enabled && !!projectSlug,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch method call graph (nodes + edges) */
export function useMethodGraph(projectSlug: string, enabled = true) {
  return useQuery({
    queryKey: ['method-graph', projectSlug],
    queryFn: async () => {
      const { data } = await axios.get(`${METHOD_API}/methods/${projectSlug}/graph`);
      return data;
    },
    enabled: enabled && !!projectSlug,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

/** Trigger method observatory ingestion. Returns the ingest response. */
export async function ingestMethodData(ecosystem: string, packageName: string, version?: string) {
  const url = new URL(`${METHOD_API}/methods/ingest/${ecosystem}/${encodeURIComponent(packageName)}`);
  if (version) {
    url.searchParams.set('version', version);
  }
  const { data } = await axios.post(url.toString());
  return data;
}
