import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Layout } from './components/Layout';
import PackageSearch from './pages/PackageSearch';
import PackageDetail from './pages/PackageDetail';
import TopRisk from './pages/TopRisk';
import MetricsGlossary from './pages/MetricsGlossary';

// Global HTTP Cache Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes standard cache
    },
  },
});

/** Backward-compat redirect: /graph?ecosystem=X&package=Y&version=Z → /package/X/Y/Z?tab=supply-chain */
function GraphRedirect() {
  const [sp] = useSearchParams();
  const eco = sp.get('ecosystem') || 'npm';
  const pkg = sp.get('package');
  const ver = sp.get('version');
  if (pkg && ver) {
    return <Navigate to={`/package/${eco}/${encodeURIComponent(pkg)}/${encodeURIComponent(ver)}?tab=supply-chain`} replace />;
  }
  // No params → return home
  return <Navigate to="/" replace />;
}

/** Backward-compat redirect: /research?ecosystem=X&package=Y&version=Z → /package/X/Y/Z */
function ResearchRedirect() {
  const [sp] = useSearchParams();
  const eco = sp.get('ecosystem') || 'npm';
  const pkg = sp.get('package');
  const ver = sp.get('version');
  if (pkg && ver) {
    return <Navigate to={`/package/${eco}/${encodeURIComponent(pkg)}/${encodeURIComponent(ver)}`} replace />;
  }
  return <Navigate to="/" replace />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
          <Routes>
            {/* Primary routes */}
            <Route path="/" element={<PackageSearch />} />
            <Route path="/package/:ecosystem/:name/:version" element={<PackageDetail />} />
            <Route path="/analytics" element={<TopRisk />} />
            <Route path="/glossary" element={<MetricsGlossary />} />

            {/* Backward-compatible redirects */}
            <Route path="/graph" element={<GraphRedirect />} />
            <Route path="/research" element={<ResearchRedirect />} />
            
            {/* Catch-all legacy methods route to index */}
            <Route path="/methods/*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
