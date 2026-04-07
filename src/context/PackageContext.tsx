import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { toProjectSlug } from '../utils/format';

export interface PackageIdentity {
  ecosystem: string;
  packageName: string;
  version: string;
  /** Derived slug for oscar-method-observatory API calls */
  projectSlug: string;
}

const PackageContext = createContext<PackageIdentity | null>(null);

interface PackageProviderProps {
  ecosystem: string;
  packageName: string;
  version: string;
  children: ReactNode;
}

export function PackageProvider({ ecosystem, packageName, version, children }: PackageProviderProps) {
  const value: PackageIdentity = {
    ecosystem,
    packageName,
    version,
    projectSlug: toProjectSlug(packageName),
  };

  return (
    <PackageContext.Provider value={value}>
      {children}
    </PackageContext.Provider>
  );
}

export function usePackageIdentity(): PackageIdentity {
  const ctx = useContext(PackageContext);
  if (!ctx) {
    throw new Error('usePackageIdentity must be used within a <PackageProvider>');
  }
  return ctx;
}
