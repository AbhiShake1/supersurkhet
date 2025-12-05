import React, { createContext, useContext, ReactNode } from 'react';

interface ContextData {
  user?: {
    name?: string;
    email?: string;
    id?: string;
    [key: string]: any;
  };
  business?: {
    name?: string;
    id?: string;
    [key: string]: any;
  };
  context?: {
    currentTime?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface ContextDataStoreProps {
  children: ReactNode;
  contextData: ContextData;
}

export const ContextDataStoreContext = createContext<ContextData | undefined>(undefined);

export const ContextDataStore: React.FC<ContextDataStoreProps> = ({ 
  children, 
  contextData 
}) => {
  return (
    <ContextDataStoreContext.Provider value={contextData}>
      {children}
    </ContextDataStoreContext.Provider>
  );
};

export const useContextData = (): ContextData => {
  const context = useContext(ContextDataStoreContext);
  if (context === undefined) {
    throw new Error('useContextData must be used within a ContextDataStore');
  }
  return context;
};