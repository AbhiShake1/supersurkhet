import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { NotFound } from "@/components/ui/not-found";
import { Slot, Slottable } from "@radix-ui/react-slot";
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
  asChild: z.boolean().optional(),
})

interface DataDetailProps extends React.HTMLAttributes<HTMLDivElement> {
  dataId: string;
  table: SchemaKeys;
  asChild?: boolean;
}

const DataDetail = React.forwardRef<HTMLDivElement, DataDetailProps>(
  ({ className, asChild, table = "product", dataId, children, ...props }, ref) => {
    dataId = dataId.trim()
    const { business } = useBusiness()
    const { data: _data = [], isLoading } = api[table].useGet({ keys: [business?.id ?? "", dataId], single: true })
    const data = _data?.[0]

    if (isLoading) {
      if (asChild) {
        return (
          <Slot ref={ref}>
            <Skeleton className="h-40 w-full rounded-md mb-3" />
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2 mb-3" />
            <Skeleton className="h-8 w-full rounded" />
          </Slot>
        );
      }
      return (
        <div ref={ref} className={cn(className)} {...props}>
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

    if (asChild) {
      return (
        <Slot ref={ref}>
          <DataProvider data={data}>
            {children}
          </DataProvider>
        </Slot>
      );
    }
    return (
      <div ref={ref} className={cn(className)} {...props}>
        <DataProvider data={data}>
          {children}
        </DataProvider>
      </div>
    );
  }
);
DataDetail.displayName = "DataDetail";

export const DataListSchema = z.object({
  table: tableSchema.optional(),
  children: z.any().optional(),
  className: z.string().optional(),
  asChild: z.boolean().optional(),
})

interface DataListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  table: SchemaKeys;
  asChild?: boolean;
}

// DataList component - the main container
const DataList = React.forwardRef<HTMLDivElement, DataListProps>(
  ({ className, asChild, table = "product", children, ...props }, ref) => {
    const { business } = useBusiness()
    const { data, isLoading } = api[table].useGet({ keys: [business?.id ?? ""] })

    const dataList = data as Data[] ?? []

    if (isLoading) {
      if (asChild) {
        // When asChild is true and loading, return skeleton items without container
        return (
          <>
            {[...Array(8)].map((_, index) => (
              <Skeleton key={index} className="h-80 w-full rounded-xl" />
            ))}
          </>
        );
      }
      return (
        <div ref={ref} className={cn(className)} {...props}>
          {[...Array(8)].map((_, index) => (
            <Skeleton key={index} className="h-80 w-full rounded-xl" />
          ))}
        </div>
      );
    }

    if (asChild) {
      // When asChild is true, we need to handle multiple children differently
      // because Slot expects only one child, so we wrap in a fragment first
      // and then let the parent Slot handle flattening
      const mappedChildren = dataList.map((data) => (
        <DataProvider key={data._?.soul} data={data}>
          {children}
        </DataProvider>
      ));

      // If we have multiple children, we can't directly use Slot
      // Instead, we return the mapped children without a container
      return <>{mappedChildren}</>;
    }
    // When asChild is false, render with default container
    return (
      <div ref={ref} className={cn(className)} {...props}>
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
  asChild: z.boolean().optional(),
})

interface DataProps extends React.HTMLAttributes<HTMLDivElement> {
  isLoading?: boolean;
  children?: React.ReactNode;
  asChild?: boolean;
}

// Data component - the individual data card
const SingleData = React.forwardRef<HTMLDivElement, DataProps>(
  ({ className, asChild, isLoading = false, children, ...props }, ref) => {
    const { data: _data } = useData();
    const data = _data as Data | undefined

    if (isLoading || !data) {
      if (asChild) {
        return (
          <Slot ref={ref}>
            <Skeleton className="h-40 w-full rounded-md mb-3" />
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2 mb-3" />
            <Skeleton className="h-8 w-full rounded" />
          </Slot>
        );
      }
      return (
        <div ref={ref} className={cn(className)} {...props}>
          <Skeleton className="h-40 w-full rounded-md mb-3" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2 mb-3" />
          <Skeleton className="h-8 w-full rounded" />
        </div>
      );
    }

    if (asChild) {
      return (
        <Slot ref={ref}>
          {children}
        </Slot>
      );
    }
    return (
      <div ref={ref} className={cn(className)} {...props}>
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
