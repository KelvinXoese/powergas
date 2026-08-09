import type React from 'react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from 'recharts';
import { api } from '../../services/api';
import { PageHeader, Panel } from '../../components/ui';

export function FinancialReporting() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const [start, setStart] = useState(monthAgo);
  const [end, setEnd] = useState(today);

  const { data, isLoading } = useQuery({
    queryKey: ['financial-report', start, end],
    queryFn: async () => (await api.get(`/admin/financial-report?start=${start}&end=${end}`)).data.data,
  });

  const chart = (data ?? []).map((r: any) => ({
    date: new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    revenue: Number(r.revenue), commission: Number(r.commission), riders: Number(r.riderEarnings),
  }));

  const inputStyle: React.CSSProperties = { padding: '9px 12px', background: 'var(--slate-950)', border: '1px solid var(--slate-700)', borderRadius: 8, color: 'var(--ink-100)', fontSize: 13, fontFamily: 'var(--mono)' };

  return (
    <div>
      <PageHeader eyebrow="FINANCE" title="Financial Reporting"
        action={<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} style={inputStyle} />
          <span style={{ color: 'var(--ink-300)' }}>→</span>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} style={inputStyle} />
        </div>} />
      <Panel title="Revenue · Commission · Rider Earnings">
        {isLoading ? <div style={{ color: 'var(--ink-300)', padding: 40 }}>Loading…</div> : (
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--slate-800)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--ink-300)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--ink-300)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: 'var(--slate-850)', border: '1px solid var(--slate-700)', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="revenue" stroke="var(--flame)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="commission" stroke="var(--teal)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="riders" stroke="var(--blue)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Panel>
    </div>
  );
}
