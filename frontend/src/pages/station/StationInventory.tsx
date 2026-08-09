import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Boxes } from 'lucide-react';
import { api } from '../../services/api';
import { useStationId } from '../../hooks/useStation';
import { PageHeader } from '../../components/ui';

export function StationInventory() {
  const { data: stationId } = useStationId();
  const { data: types } = useQuery({ queryKey: ['types'], queryFn: async () => (await api.get('/inventory/types')).data.data });
  const { data: inventory, isLoading } = useQuery({
    queryKey: ['station-inventory', stationId],
    enabled: !!stationId,
    queryFn: async () => (await api.get(`/inventory/station/${stationId}`)).data.data,
  });

  const typeName = (id: string) => types?.find((t: any) => t.id === id)?.name ?? id.slice(0, 8);

  return (
    <div>
      <PageHeader eyebrow="STOCK CONTROL" title="Inventory" />
      {isLoading && <div style={{ color: 'var(--ink-300)' }}>Loading inventory…</div>}
      {!isLoading && (!inventory || inventory.length === 0) && (
        <div style={{ background: 'var(--slate-900)', border: '1px solid var(--slate-800)', borderRadius: 12, padding: 32, color: 'var(--ink-300)' }}>
          No inventory records yet. Set pricing for a cylinder type to create one.
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {inventory?.map((inv: any) => {
          const available = inv.filledCount - inv.reservedCount;
          const low = available <= inv.lowStockThreshold;
          return (
            <div key={inv.id} style={{ background: 'var(--slate-900)', border: `1px solid ${low ? 'var(--amber)' : 'var(--slate-800)'}`, borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 9, background: 'var(--flame-glow)', color: 'var(--flame)' }}><Boxes size={18} /></div>
                {low && <span style={{ fontSize: 10, color: 'var(--amber)', fontFamily: 'var(--mono)', letterSpacing: 1 }}>LOW STOCK</span>}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--mono)' }}>{typeName(inv.cylinderTypeId)}</div>
              <div style={{ display: 'flex', gap: 16, marginTop: 14, fontFamily: 'var(--mono)' }}>
                <div><div style={{ fontSize: 20, color: 'var(--teal)' }}>{inv.filledCount}</div><div style={{ fontSize: 10, color: 'var(--ink-300)' }}>FILLED</div></div>
                <div><div style={{ fontSize: 20, color: 'var(--ink-300)' }}>{inv.emptyCount}</div><div style={{ fontSize: 10, color: 'var(--ink-300)' }}>EMPTY</div></div>
                <div><div style={{ fontSize: 20, color: 'var(--amber)' }}>{inv.reservedCount}</div><div style={{ fontSize: 10, color: 'var(--ink-300)' }}>RESERVED</div></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
