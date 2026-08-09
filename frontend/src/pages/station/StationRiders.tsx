import { useQuery } from '@tanstack/react-query';
import { Bike } from 'lucide-react';
import { api } from '../../services/api';
import { useStationId } from '../../hooks/useStation';
import { PageHeader } from '../../components/ui';
import { StatusBadge } from '../../components/StatusBadge';

export function StationRiders() {
  const { data: stationId } = useStationId();
  const { data, isLoading } = useQuery({
    queryKey: ['station-riders', stationId],
    enabled: !!stationId,
    queryFn: async () => (await api.get(`/station-dashboard/${stationId}/riders`)).data.data,
  });

  return (
    <div>
      <PageHeader eyebrow="FLEET" title="Riders" />
      {isLoading && <div style={{ color: 'var(--ink-300)' }}>Loading riders…</div>}
      {!isLoading && data?.length === 0 && <div style={{ color: 'var(--ink-300)' }}>No riders assigned to this station yet.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {data?.map((r: any) => (
          <div key={r.id} style={{ background: 'var(--slate-900)', border: '1px solid var(--slate-800)', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 9, background: 'var(--slate-800)', color: 'var(--flame)' }}><Bike size={18} /></div>
              <StatusBadge status={r.status} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{r.user?.firstName} {r.user?.lastName}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-300)', marginTop: 4 }}>{r.vehicleType ?? 'Vehicle —'} · {r.vehiclePlate ?? 'No plate'}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--slate-800)', fontSize: 12, color: 'var(--ink-300)', fontFamily: 'var(--mono)' }}>
              <span>★ {Number(r.averageRating).toFixed(1)}</span>
              <span>{r.totalDeliveries} deliveries</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
