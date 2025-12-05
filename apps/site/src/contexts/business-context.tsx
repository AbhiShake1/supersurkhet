import React from "react";
import type { Business } from "@/lib/schema";

export type BusinessContextReturn = {
  business: Business;
}

export const BusinessContext = React.createContext<BusinessContextReturn | undefined>(undefined);

export const BusinessProvider: React.FC<{ business: Business, children: React.ReactNode }> = ({ business, children }) => {
  return (
    <BusinessContext.Provider value={{ business }}>
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const context = React.useContext(BusinessContext);
  if (!context) {
    throw new Error(
      "Business components cannot be rendered outside the Business Context",
    );
  }
  return context;
};
