import type { AdminComponent } from "@/components/ui/admin";
import { api } from "@/lib/api";

export const SalesPage: AdminComponent = ({ slug }) => {
  const { data: products = [] } = api.product.useGet({
    keys: [slug],
  })
  return <div>Sales Page</div>;
};
