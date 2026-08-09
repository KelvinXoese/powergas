import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { api } from '../../services/api';
import { useStationId } from '../../hooks/useStation';
import { PageHeader, MetricCard, Panel } from '../../components/ui';

export function StationRevenue() {
  const { data: stationId } = useStationId();
  const { data: overview } = useQuery({
    queryKey: ['station-overview', stationId], enabled: !!stationId,
    queryFn: async () => (await api.get(`/station-dashboard/${stationId}/overview`)).data.data,
  });
  const { data: series } = useQuery({
    queryKey: ['station-revenue-30', stationId], enabled: !!stationId,
    queryFn: async () => (await api.get(`/station-dashboard/${stationId}/revenue-series?days=30`)).data.data,
  });

  const chart = (series ?? []).map((r: any) => ({ date: new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), earnings: Number(r.earnings) }));

  return (
    <div>
      <PageHeader eyebrow="FINANCE" title="Revenue" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <MetricCard label="Total Earnings (net)" value={`GHS ${Number(overview?.totalEarnings ?? 0).toLocaleString()}`} accent="var(--teal)" />
        <MetricCard label="Completed Orders" value={overview?.completedOrders ?? '—'} accent="var(--flame)" />
        <MetricCard label="Completion Rate" value={overview ? `${overview.completionRate.toFixed(1)}%` : '—'} accent="var(--blue)" />
      </div>
      <Panel title="Earnings — Last 30 Days">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--slate-800)" vertical={false} />
            <XAxis dataKey="date" stroke="var(--ink-300)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--ink-300)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: 'var(--slate-850)', border: '1px solid var(--slate-700)', borderRadius: 8 }} />
            <Line type="monotone" dataKey="earnings" stroke="var(--flame)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}
