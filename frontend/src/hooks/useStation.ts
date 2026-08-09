import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuthStore } from '../store/auth';

/**
 * Resolves the station the current user belongs to via the authoritative
 * staff-to-station mapping (GET /stations/my-station).
 *
 * - STATION_STAFF / STATION_MANAGER → their assigned station.
 * - ADMIN / SUPER_ADMIN with no assignment → falls back to the first active
 *   station so they can preview the station console.
 */
export function useStationId() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['my-station', user?.id],
    queryFn: async (): Promise<string | null> => {
      const res = await api.get('/stations/my-station');
      const resolved = res.data?.data?.stationId;
      if (resolved) return resolved;

      // Admins previewing the station view with no explicit assignment
      const stations = await api.get('/stations?limit=1');
      return stations.data?.data?.items?.[0]?.id ?? null;
    },
  });
}
