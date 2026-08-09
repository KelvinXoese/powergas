import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { api } from '../../services/api';
import { PageHeader, MetricCard, Panel } from '../../components/ui';

export function PlatformOverview() {
  const { data } = useQuery({ queryKey: ['analytics'], queryFn: async () => (await api.get('/admin/analytics')).data.data });

  // Previously this chart used hardcoded fake numbers (Mon: 4200, Tue:
  // 5100…) that never reflected real activity — the backend already had a
  // working financial-report endpoint, it just wasn't being called.
  const { data: report } = useQuery({
    queryKey: ['financial-report-7d'],
    queryFn: async () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      const { data } = await api.get('/admin/financial-report', {
        params: { start: start.toISOString(), end: end.toISOString() },
      });
      return data.data;
    },
  });

  const chart = (report ?? []).map((r: any) => ({
    day: new Date(r.date).toLocaleDateString(undefined, { weekday: 'short' }),
    revenue: Number(r.revenue),
  }));

  return (
    <div>
      <PageHeader eyebrow="PLATFORM TELEMETRY" title="Platform Overview" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <MetricCard label="Total Orders" value={data?.totalOrders ?? '—'} accent="var(--flame)" />
        <MetricCard label="Active Stations" value={data?.totalStations ?? '—'} accent="var(--teal)" />
        <MetricCard label="Registered Users" value={data?.totalUsers ?? '—'} accent="var(--blue)" />
        <MetricCard label="Completion Rate" value={data ? `${data.completionRate.toFixed(1)}%` : '—'} accent="var(--amber)" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        <Panel title="Platform Revenue — Last 7 Days">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--slate-800)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--ink-300)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--ink-300)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: 'var(--slate-850)', border: '1px solid var(--slate-700)', borderRadius: 8 }} cursor={{ fill: 'var(--slate-800)' }} />
              <Bar dataKey="revenue" fill="var(--flame)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Financials">
          {[
            ['Gross Revenue', `GHS ${Number(data?.totalRevenue ?? 0).toLocaleString()}`, 'var(--ink-100)'],
            ['Platform Commission', `GHS ${Number(data?.platformCommission ?? 0).toLocaleString()}`, 'var(--teal)'],
            ['Completed Orders', data?.completedOrders ?? 0, 'var(--ink-100)'],
          ].map(([l, v, c]) => (
            <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--slate-800)' }}>
              <span style={{ fontSize: 13, color: 'var(--ink-300)' }}>{l}</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: c as string, fontFamily: 'var(--mono)' }}>{v}</span>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}
