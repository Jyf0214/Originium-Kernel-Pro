'use client';

import React, { type ReactNode, createContext, useContext } from 'react';

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
  return (
    <LoadingContext.Provider value={{ loadingConfig }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoadingContext() {
  return useContext(LoadingContext);
}