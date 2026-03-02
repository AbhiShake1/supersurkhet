export type AdminComponentProps = {
  // data: NestedSchemaType<T>[];
  slug: string;
  permissions?: {
    canRead: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  };
};

export type AdminComponent = React.FC<AdminComponentProps>;
