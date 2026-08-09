import type React from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { PageHeader, Panel, Button, tableStyles as t } from '../../components/ui';

export function CommissionManagement() {
  const qc = useQueryClient();
  const [percent, setPercent] = useState('');
  const [stationId, setStationId] = useState('');

  const { data: commissions } = useQuery({ queryKey: ['commissions'], queryFn: async () => (await api.get('/admin/commissions')).data.data });
  const { data: stations } = useQuery({ queryKey: ['stations'], queryFn: async () => (await api.get('/stations?limit=100')).data.data.items });

  const save = useMutation({
    mutationFn: async () => api.post('/admin/commissions', { commissionPercent: Number(percent), stationId: stationId || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['commissions'] }); setPercent(''); setStationId(''); },
  });

  return (
    <div>
      <PageHeader eyebrow="REVENUE MODEL" title="Commission" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 16 }}>
        <Panel title="Set commission rate">
          <label style={{ display: 'block', fontSize: 11, color: 'var(--ink-300)', marginBottom: 6 }}>Scope</label>
          <select value={stationId} onChange={(e) => setStationId(e.target.value)}
            style={{ width: '100%', padding: '11px 14px', background: 'var(--slate-950)', border: '1px solid var(--slate-700)', borderRadius: 9, color: 'var(--ink-100)', fontSize: 14, marginBottom: 16 }}>
            <option value="">Platform default (all stations)</option>
            {stations?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--ink-300)', marginBottom: 6 }}>Commission percent</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--slate-950)', border: '1px solid var(--slate-700)', borderRadius: 9, padding: '0 14px', marginBottom: 20 }}>
            <input type="number" min="0" max="100" step="0.5" value={percent} onChange={(e) => setPercent(e.target.value)}
              style={{ flex: 1, padding: '11px 0', background: 'transparent', border: 'none', color: 'var(--ink-100)', fontSize: 15, fontFamily: 'var(--mono)', outline: 'none' }} />
            <span style={{ color: 'var(--ink-300)', fontFamily: 'var(--mono)' }}>%</span>
          </div>
          <Button onClick={() => save.mutate()} disabled={!percent || save.isPending}>{save.isPending ? 'Saving…' : 'Apply commission'}</Button>
        </Panel>

        <Panel title="Active commission rules">
          <div style={t.wrap}>
            <table style={t.table}>
              <thead><tr>{['Scope', 'Rate', 'Active', 'Set'].map((h) => <th key={h} style={t.th}>{h}</th>)}</tr></thead>
              <tbody>
                {commissions?.map((c: any) => (
                  <tr key={c.id}>
                    <td style={t.td}>{c.stationId ? `Station ${c.stationId.slice(0, 8)}` : 'Platform default'}</td>
                    <td style={{ ...t.td, fontFamily: 'var(--mono)', color: 'var(--teal)' }}>{Number(c.commissionPercent).toFixed(1)}%</td>
                    <td style={t.td}>{c.isActive ? '✓' : '—'}</td>
                    <td style={{ ...t.td, color: 'var(--ink-300)', fontFamily: 'var(--mono)', fontSize: 12 }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {(!commissions || commissions.length === 0) && <tr><td colSpan={4} style={t.empty}>No custom rules. Platform uses the env default.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
