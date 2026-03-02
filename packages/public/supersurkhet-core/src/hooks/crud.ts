import { useMutation, useQuery, type UseQueryOptions } from '@tanstack/react-query';

export interface CrudClient<TItem, TCreate = Partial<TItem>, TUpdate = Partial<TItem>> {
  get: (id: string) => Promise<TItem | null>;
  create: (payload: TCreate) => Promise<TItem>;
  update: (id: string, payload: TUpdate) => Promise<TItem>;
  remove: (id: string) => Promise<void>;
}

export function useGet<TItem>(
  key: unknown[],
  get: () => Promise<TItem>,
  options?: Omit<UseQueryOptions<TItem>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({ queryKey: key, queryFn: get, ...options });
}

export function useCreate<TItem, TCreate>(client: CrudClient<TItem, TCreate>) {
  return useMutation({ mutationFn: (payload: TCreate) => client.create(payload) });
}

export function useUpdate<TItem, TCreate, TUpdate>(
  client: CrudClient<TItem, TCreate, TUpdate>,
) {
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TUpdate }) =>
      client.update(id, payload),
  });
}

export function useDelete<TItem, TCreate, TUpdate>(
  client: CrudClient<TItem, TCreate, TUpdate>,
) {
  return useMutation({ mutationFn: (id: string) => client.remove(id) });
}
