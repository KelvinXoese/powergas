import type React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { PageHeader, tableStyles as t } from '../../components/ui';
import { StatusBadge } from '../../components/StatusBadge';

export function RiderMonitoring() {
  const qc = useQueryClient();

  // Previously this fetched riders indirectly through every station's
  // roster (N+1 queries), which would also miss any rider not yet
  // assigned to a station. Uses the real admin list endpoint now.
  const { data, isLoading } = useQuery({
    queryKey: ['all-riders'],
    queryFn: async () => (await api.get('/riders?limit=100')).data.data,
  });

  const review = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'VERIFIED' | 'REJECTED' }) =>
      api.patch(`/riders/${id}/verification`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-riders'] }),
  });

  return (
    <div>
      <PageHeader eyebrow="FLEET MONITORING" title="Rider Monitoring" />
      <div style={t.wrap}>
        <table style={t.table}>
          <thead><tr>{['Rider', 'Verification', 'Availability', 'Rating', 'Deliveries', 'Location', 'Action'].map((h) => <th key={h} style={t.th}>{h}</th>)}</tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} style={t.empty}>Loading riders…</td></tr>}
            {!isLoading && data?.items?.length === 0 && <tr><td colSpan={7} style={t.empty}>No riders registered.</td></tr>}
            {data?.items?.map((r: any) => (
              <tr key={r.id}>
                <td style={t.td}>{r.user?.firstName} {r.user?.lastName}</td>
                <td style={t.td}><StatusBadge status={r.verificationStatus} /></td>
                <td style={t.td}><StatusBadge status={r.status} /></td>
                <td style={{ ...t.td, fontFamily: 'var(--mono)' }}>★ {Number(r.averageRating).toFixed(1)}</td>
                <td style={{ ...t.td, fontFamily: 'var(--mono)' }}>{r.totalDeliveries}</td>
                <td style={{ ...t.td, color: 'var(--ink-300)', fontFamily: 'var(--mono)', fontSize: 12 }}>
                  {r.currentLat ? `${Number(r.currentLat).toFixed(3)}, ${Number(r.currentLng).toFixed(3)}` : 'Offline'}
                </td>
                <td style={t.td}>
                  {/* An unverified rider can't accept a single job (enforced
                      server-side) until an admin approves them here — this
                      button is the only thing that unblocks a new rider. */}
                  {r.verificationStatus === 'PENDING' ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => review.mutate({ id: r.id, status: 'VERIFIED' })} disabled={review.isPending}
                        style={{ padding: '5px 10px', background: 'rgba(45,212,191,0.12)', border: '1px solid var(--teal)', borderRadius: 6, color: 'var(--teal)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        Approve
                      </button>
                      <button onClick={() => review.mutate({ id: r.id, status: 'REJECTED' })} disabled={review.isPending}
                        style={{ padding: '5px 10px', background: 'rgba(244,63,94,0.12)', border: '1px solid var(--rose)', borderRadius: 6, color: 'var(--rose)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        Reject
                      </button>
                    </div>
                  ) : <span style={{ color: 'var(--ink-300)', fontSize: 12 }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
