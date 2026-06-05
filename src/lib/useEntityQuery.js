/**
 * Thin React Query wrapper around base44 entity list/filter calls.
 * Provides automatic caching between page navigations (5 min stale time).
 *
 * Usage:
 *   const { data: orders, isLoading, refetch } = useEntityQuery("Order", { sort: "-created_date", limit: 200 });
 *   const { data: items } = useEntityQuery("MenuItem", { filter: { is_available: true } });
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useEntityQuery(entityName, { sort, limit = 100, filter } = {}) {
  const queryKey = ["entity", entityName, sort, limit, filter ? JSON.stringify(filter) : ""];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const entity = base44.entities[entityName];
      if (filter) return entity.filter(filter, sort, limit);
      return entity.list(sort, limit);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useInvalidate() {
  const qc = useQueryClient();
  return (entityName) => qc.invalidateQueries({ queryKey: ["entity", entityName] });
}