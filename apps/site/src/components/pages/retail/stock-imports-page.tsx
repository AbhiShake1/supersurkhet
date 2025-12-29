import type { AdminComponent } from "@/components/ui/admin";
import { api } from "@/lib/api";

export const StockImportsPage: AdminComponent = ({ slug }) => {
  const { data: parties = [] } = api.party.useGet({
    keys: [slug],
  })

  const { data: products = [] } = api.product.useGet({
    keys: [slug],
  })

  return <div>Stock Imports Page</div>;
};
