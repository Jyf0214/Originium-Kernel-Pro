'use client';

import React, { type ReactNode, createContext, useContext, useMemo } from 'react';

interface LoadingConfig {
  page?: {
    type: string;
    color: string;
    position: string;
  };
  navigation?: {
    type: string;
    color: string;
  };
}

interface LoadingContextType {
  loadingConfig?: LoadingConfig;
}

const LoadingContext = createContext<LoadingContextType>({});

export function LoadingProvider({ children, loadingConfig }: { children: ReactNode; loadingConfig?: LoadingConfig }) {
  const value = useMemo(() => ({ loadingConfig }), [loadingConfig]);
  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoadingContext() {
  return useContext(LoadingContext);
}