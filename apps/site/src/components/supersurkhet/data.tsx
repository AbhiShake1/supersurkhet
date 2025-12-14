import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { NotFound } from "@/components/ui/not-found";
import { useBusiness } from "@/contexts/business-context";
import { z } from "zod";
import type { SchemaKeys } from "@/lib/gun/index";
import type { AppSchemaType } from "@/lib/schema";

type AllCompositeSchemas = AppSchemaType["shape"]

type Data = {
  [K in keyof AllCompositeSchemas]: z.infer<AllCompositeSchemas[K]>;
}[keyof AllCompositeSchemas];

// Data context types
interface DataContextProps {
  data: Data;
  isLoading?: boolean;
}

const DataContext = React.createContext<DataContextProps | undefined>(undefined);

const useData = () => {
  const context = React.useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};

const tableSchema = z.any()

export const DataDetailSchema = z.object({
  table: tableSchema.optional(),
  dataId: z.string(),
  children: z.any().optional(),
  className: z.string().optional(),
})

interface DataDetailProps extends React.HTMLAttributes<HTMLDivElement> {
  dataId: string;
  table: SchemaKeys;
}

const DataDetail = React.forwardRef<HTMLDivElement, DataDetailProps>(
  ({ className, table = "product", dataId, children, ...props }, ref) => {
    dataId = dataId.trim()
    const { business } = useBusiness()
    const { data: _data = [], isLoading } = api[table].useGet({ keys: [business?.id ?? "", dataId], single: true })
    const data = _data?.[0]

    if (isLoading) {
      return (
        <div ref={ref} className={cn("rounded-xl border bg-card p-4", className)} {...props}>
          <Skeleton className="h-40 w-full rounded-md mb-3" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2 mb-3" />
          <Skeleton className="h-8 w-full rounded" />
        </div>
      );
    }

    if (!data) {
      return <NotFound />
    }

    return (
      <DataProvider data={data}>
        <div ref={ref} className={cn("rounded-xl border bg-card p-4 flex flex-col", className)} {...props}>
          {children}
        </div>
      </DataProvider>
    );
  }
);
DataDetail.displayName = "DataDetail";

export const DataListSchema = z.object({
  table: tableSchema.optional(),
  children: z.any().optional(),
  className: z.string().optional(),
})

interface DataListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  table: SchemaKeys;
}

// DataList component - the main container
const DataList = React.forwardRef<HTMLDivElement, DataListProps>(
  ({ className, table = "product", children, ...props }, ref) => {
    const { business } = useBusiness()
    const { data, isLoading } = api[table].useGet({ keys: [business?.id ?? ""] })

    const dataList = data as Data[] ?? []

    if (isLoading) {
      return (
        <div ref={ref} className={cn("grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6", className)} {...props}>
          {[...Array(8)].map((_, index) => (
            <Skeleton key={index} className="h-80 w-full rounded-xl" />
          ))}
        </div>
      );
    }

    return (
      <div ref={ref} className={cn("grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6", className)} {...props}>
        {dataList.map((data) => (
          <DataProvider key={data._?.soul} data={data}>
            {children}
          </DataProvider>
        ))}
      </div>
    );
  }
);
DataList.displayName = "DataList";

// DataProvider component to pass data context to children
interface DataProviderProps {
  data: Data;
  children: React.ReactNode;
}

const DataProvider: React.FC<DataProviderProps> = ({ data, children }) => {
  return (
    <DataContext.Provider value={{ data }}>
      {children}
    </DataContext.Provider>
  );
};

export const DataSchema = z.object({
  children: z.any().optional(),
  className: z.string().optional(),
})

interface DataProps extends React.HTMLAttributes<HTMLDivElement> {
  isLoading?: boolean;
  children?: React.ReactNode;
}

// Data component - the individual data card
const SingleData = React.forwardRef<HTMLDivElement, DataProps>(
  ({ className, isLoading = false, children, ...props }, ref) => {
    const { data: _data } = useData();
    const data = _data as Data | undefined

    if (isLoading || !data) {
      return (
        <div ref={ref} className={cn("rounded-xl border bg-card p-4", className)} {...props}>
          <Skeleton className="h-40 w-full rounded-md mb-3" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2 mb-3" />
          <Skeleton className="h-8 w-full rounded" />
        </div>
      );
    }

    return (
      <div ref={ref} className={cn("rounded-xl border bg-card p-4 flex flex-col", className)} {...props}>
        {children}
      </div>
    );
  }
);
SingleData.displayName = "SingleData";

export {
  DataList,
  DataProvider,
  SingleData,
  DataDetail,
  type Data,
  useData,
};
