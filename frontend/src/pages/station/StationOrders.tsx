import type React from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useStationId } from '../../hooks/useStation';
import { PageHeader, Button, tableStyles as t } from '../../components/ui';
import { StatusBadge } from '../../components/StatusBadge';

// Matches the full round trip in backend/src/orders/orders.service.ts
// (isValidTransition). Only the STATION-driven steps get a button here —
// everything from RIDER_ASSIGNED through RIDER_EN_ROUTE_STATION is the
// rider's own job, walked through in the rider app, not this console.
const NEXT_STATUS: Record<string, string> = {
  PENDING: 'ACCEPTED',
  ACCEPTED: 'INVENTORY_RESERVED',
  INVENTORY_RESERVED: 'PREPARING',
  // AT_STATION → RIDER_EN_ROUTE_DELIVERY is the station confirming
  // "refill done, cylinder's ready to go back" — this was missing
  // entirely before; the station had no way to hand the order back
  // to the rider once it reached the station.
  AT_STATION: 'RIDER_EN_ROUTE_DELIVERY',
};

export function StationOrders() {
  const { data: stationId } = useStationId();
  const qc = useQueryClient();
  const [changeRequestFor, setChangeRequestFor] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['station-orders', stationId],
    enabled: !!stationId,
    queryFn: async () => (await api.get(`/orders/station/${stationId}?limit=50`)).data.data,
  });

  const advance = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      api.patch(`/orders/${id}/status`, { status, notes: 'Advanced from station console' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['station-orders'] }),
  });

  return (
    <div>
      <PageHeader eyebrow="FULFILLMENT" title="Order Fulfillment" />
      <div style={t.wrap}>
        <table style={t.table}>
          <thead><tr>{['Order #', 'Type', 'Status', 'Total', 'Action'].map((h) => <th key={h} style={t.th}>{h}</th>)}</tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} style={t.empty}>Loading…</td></tr>}
            {!isLoading && data?.items?.length === 0 && <tr><td colSpan={5} style={t.empty}>No orders for this station yet.</td></tr>}
            {data?.items?.map((o: any) => (
              <tr key={o.id}>
                <td style={{ ...t.td, fontFamily: 'var(--mono)', color: 'var(--flame-soft)' }}>{o.orderNumber}</td>
                <td style={t.td}>{o.type.replace(/_/g, ' ')}</td>
                <td style={t.td}><StatusBadge status={o.status} /></td>
                <td style={{ ...t.td, fontFamily: 'var(--mono)' }}>GHS {Number(o.total).toFixed(2)}</td>
                <td style={t.td}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {NEXT_STATUS[o.status] ? (
                      <button
                        onClick={() => advance.mutate({ id: o.id, status: NEXT_STATUS[o.status] })}
                        style={{ padding: '6px 12px', background: 'var(--slate-800)', border: '1px solid var(--slate-700)', borderRadius: 7, color: 'var(--flame-soft)', fontSize: 12, cursor: 'pointer' }}
                      >
                        → {NEXT_STATUS[o.status].replace(/_/g, ' ')}
                      </button>
                    ) : <span style={{ color: 'var(--ink-300)', fontSize: 12 }}>—</span>}

                    {/* A change request only makes sense once the cylinder
                        is physically at the station to inspect. */}
                    {o.status === 'AT_STATION' && (
                      <button
                        onClick={() => setChangeRequestFor(o)}
                        style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--amber)', borderRadius: 7, color: 'var(--amber)', fontSize: 12, cursor: 'pointer' }}
                      >
                        Flag issue
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {changeRequestFor && (
        <ChangeRequestModal
          order={changeRequestFor}
          stationId={stationId!}
          onClose={() => setChangeRequestFor(null)}
        />
      )}
    </div>
  );
}

/**
 * Photo + price → customer's Confirm & Pay, matching the concept doc's
 * "Vendor-Detected Issue Flow" exactly. This UI didn't exist anywhere
 * before — the change-requests backend module had no frontend at all.
 *
 * Photo is a URL field, not a real file picker, since actual upload/storage
 * infrastructure hasn't been built yet — this posts the URL the backend
 * DTO already expects (photoUrl: string), not a placeholder.
 */
function ChangeRequestModal({ order, stationId, onClose }: { order: any; stationId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [additionalAmount, setAdditionalAmount] = useState('');

  const submit = useMutation({
    mutationFn: async () =>
      api.post('/change-requests', {
        orderId: order.id,
        description,
        photoUrl,
        additionalAmount: Number(additionalAmount),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['station-orders'] });
      onClose();
    },
  });

  const canSubmit = description.length >= 5 && photoUrl.length > 0 && Number(additionalAmount) > 0;

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Flag an issue — {order.orderNumber}</h3>
        <p style={{ fontSize: 12, color: 'var(--ink-300)', marginBottom: 18 }}>
          Photo is required. The customer sees this exact photo and price, and must Confirm &amp; Pay before work continues.
        </p>

        <label style={label}>What's wrong</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Rubber seal is worn and needs replacing"
          rows={3}
          style={{ ...input, resize: 'none', marginBottom: 14 }}
        />

        <label style={label}>Photo URL</label>
        <input
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          placeholder="https://…"
          style={{ ...input, marginBottom: 14 }}
        />

        <label style={label}>Additional amount (GHS)</label>
        <input
          type="number"
          value={additionalAmount}
          onChange={(e) => setAdditionalAmount(e.target.value)}
          placeholder="0.00"
          style={{ ...input, marginBottom: 20, fontFamily: 'var(--mono)' }}
        />

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--slate-700)', borderRadius: 8, color: 'var(--ink-300)', fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
          <Button onClick={() => submit.mutate()} disabled={!canSubmit || submit.isPending}>
            {submit.isPending ? 'Sending…' : 'Send to customer'}
          </Button>
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center', zIndex: 50 };
const modal: React.CSSProperties = { width: 480, background: 'var(--slate-900)', border: '1px solid var(--slate-700)', borderRadius: 14, padding: 26 };
const label: React.CSSProperties = { display: 'block', fontSize: 12, color: 'var(--ink-300)', marginBottom: 6 };
const input: React.CSSProperties = { width: '100%', padding: '10px 12px', background: 'var(--slate-950)', border: '1px solid var(--slate-700)', borderRadius: 8, color: 'var(--ink-100)', fontSize: 13, boxSizing: 'border-box' };
