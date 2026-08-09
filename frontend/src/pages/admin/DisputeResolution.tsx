import type React from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { PageHeader, tableStyles as t, Button } from '../../components/ui';
import { StatusBadge } from '../../components/StatusBadge';

export function DisputeResolution() {
  const qc = useQueryClient();
  const [active, setActive] = useState<any | null>(null);
  const [resolution, setResolution] = useState('');
  const [refund, setRefund] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['disputes'],
    queryFn: async () => (await api.get('/disputes?limit=50')).data.data,
  });

  const resolve = useMutation({
    mutationFn: async () => api.patch(`/disputes/${active.id}/resolve`, { resolution, refundAmount: refund ? Number(refund) : undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['disputes'] }); setActive(null); setResolution(''); setRefund(''); },
  });

  return (
    <div>
      <PageHeader eyebrow="SUPPORT" title="Dispute Resolution" />
      <div style={t.wrap}>
        <table style={t.table}>
          <thead><tr>{['Type', 'Status', 'Description', 'Opened', ''].map((h) => <th key={h} style={t.th}>{h}</th>)}</tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} style={t.empty}>Loading…</td></tr>}
            {!isLoading && data?.items?.length === 0 && <tr><td colSpan={5} style={t.empty}>No disputes. All clear.</td></tr>}
            {data?.items?.map((d: any) => (
              <tr key={d.id}>
                <td style={t.td}>{d.type.replace(/_/g, ' ')}</td>
                <td style={t.td}><StatusBadge status={d.status} /></td>
                <td style={{ ...t.td, color: 'var(--ink-300)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.description}</td>
                <td style={{ ...t.td, color: 'var(--ink-300)', fontFamily: 'var(--mono)', fontSize: 12 }}>{new Date(d.createdAt).toLocaleDateString()}</td>
                <td style={t.td}>{d.status !== 'RESOLVED' && <button onClick={() => setActive(d)} style={{ padding: '6px 12px', background: 'var(--slate-800)', border: '1px solid var(--slate-700)', borderRadius: 7, color: 'var(--flame-soft)', fontSize: 12, cursor: 'pointer' }}>Resolve</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {active && (
        <div style={overlay} onClick={() => setActive(null)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Resolve dispute</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-300)', marginBottom: 18 }}>{active.description}</p>
            <textarea placeholder="Resolution notes" value={resolution} onChange={(e) => setResolution(e.target.value)}
              style={{ width: '100%', minHeight: 90, padding: 12, background: 'var(--slate-950)', border: '1px solid var(--slate-700)', borderRadius: 9, color: 'var(--ink-100)', fontSize: 14, marginBottom: 12, resize: 'vertical' }} />
            <input type="number" placeholder="Refund amount (optional)" value={refund} onChange={(e) => setRefund(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', background: 'var(--slate-950)', border: '1px solid var(--slate-700)', borderRadius: 9, color: 'var(--ink-100)', fontSize: 14, marginBottom: 18, fontFamily: 'var(--mono)' }} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setActive(null)}>Cancel</Button>
              <Button onClick={() => resolve.mutate()} disabled={!resolution || resolve.isPending}>{resolve.isPending ? 'Resolving…' : 'Resolve'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center', zIndex: 50 };
const modal: React.CSSProperties = { width: 440, background: 'var(--slate-900)', border: '1px solid var(--slate-700)', borderRadius: 14, padding: 26 };
