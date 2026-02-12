import React from 'react';
import type { Business } from '@/lib/schema';

export type BusinessContextReturn = {
  business: Business;
};

export const BusinessContext = React.createContext<
  BusinessContextReturn | undefined
>(undefined);

export const BusinessProvider: React.FC<{
  business: Business;
  children: React.ReactNode;
}> = ({ business, children }) => {
  return (
    <BusinessContext.Provider value={{ business }}>
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusinessSafe = () => {
  return React.useContext(BusinessContext);
};

export const useBusiness = () => {
  const context = useBusinessSafe();
  if (!context) {
    throw new Error(
      'Business components cannot be rendered outside the Business Context',
    );
  }
  return context;
};
