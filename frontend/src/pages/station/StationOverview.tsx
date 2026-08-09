import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { api } from '../../services/api';
import { useStationId } from '../../hooks/useStation';
import { PageHeader, MetricCard, Panel } from '../../components/ui';

const STOCK_OPTIONS = ['AVAILABLE', 'SHORTAGE', 'OUT_OF_STOCK'];
const STOCK_COLORS: Record<string, string> = { AVAILABLE: 'var(--teal)', SHORTAGE: 'var(--amber)', OUT_OF_STOCK: 'var(--rose)' };

export function StationOverview() {
  const { data: stationId } = useStationId();
  const qc = useQueryClient();

  const { data: overview } = useQuery({
    queryKey: ['station-overview', stationId],
    enabled: !!stationId,
    queryFn: async () => (await api.get(`/station-dashboard/${stationId}/overview`)).data.data,
  });

  const { data: series } = useQuery({
    queryKey: ['station-revenue-series', stationId],
    enabled: !!stationId,
    queryFn: async () => (await api.get(`/station-dashboard/${stationId}/revenue-series?days=7`)).data.data,
  });

  // Separate from overview analytics — this is the station's own live
  // status, so it's fetched directly rather than derived from the
  // dashboard summary endpoint (which may not include it).
  const { data: station } = useQuery({
    queryKey: ['station-detail', stationId],
    enabled: !!stationId,
    queryFn: async () => (await api.get(`/stations/${stationId}`)).data.data,
  });

  const toggleOpen = useMutation({
    mutationFn: async (isActive: boolean) => api.patch(`/stations/${stationId}/open-status`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['station-detail', stationId] }),
  });

  const setStock = useMutation({
    mutationFn: async (stockStatus: string) => api.patch(`/stations/${stationId}/stock-status`, { stockStatus }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['station-detail', stationId] }),
  });

  const chart = (series ?? []).map((r: any) => ({ date: new Date(r.date).toLocaleDateString(undefined, { weekday: 'short' }), earnings: Number(r.earnings) }));

  return (
    <div>
      <PageHeader eyebrow="YOUR STATION" title="Overview" />

      <Panel title="Station Status">
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-300)' }}>Shop</span>
            <button
              onClick={() => toggleOpen.mutate(!station?.isActive)}
              disabled={toggleOpen.isPending || !station}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                border: `1px solid ${station?.isActive ? 'var(--teal)' : 'var(--rose)'}`,
                background: station?.isActive ? 'rgba(45,212,191,0.12)' : 'rgba(244,63,94,0.12)',
                color: station?.isActive ? 'var(--teal)' : 'var(--rose)',
              }}
            >
              {station?.isActive ? 'OPEN — tap to close' : 'CLOSED — tap to open'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-300)' }}>Gas stock</span>
            {STOCK_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setStock.mutate(opt)}
                disabled={setStock.isPending}
                style={{
                  padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  border: `1px solid ${station?.stockStatus === opt ? STOCK_COLORS[opt] : 'var(--slate-700)'}`,
                  background: station?.stockStatus === opt ? `${STOCK_COLORS[opt]}22` : 'transparent',
                  color: station?.stockStatus === opt ? STOCK_COLORS[opt] : 'var(--ink-300)',
                }}
              >
                {opt.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink-300)', marginTop: 12 }}>
          These are two separate signals — a station can be open with no gas, or fully closed. A false "Available"
          status a rider finds empty gets logged as a strike against your station.
        </p>
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, margin: '24px 0' }}>
        <MetricCard label="Total Orders" value={overview?.totalOrders ?? '—'} accent="var(--flame)" />
        <MetricCard label="Pending" value={overview?.pendingOrders ?? '—'} accent="var(--amber)" />
        <MetricCard label="Completion Rate" value={overview ? `${overview.completionRate.toFixed(1)}%` : '—'} accent="var(--teal)" />
        <MetricCard label="Active Riders" value={overview?.activeRiders ?? '—'} accent="var(--blue)" />
      </div>
      <Panel title="Your Earnings — Last 7 Days">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--slate-800)" vertical={false} />
            <XAxis dataKey="date" stroke="var(--ink-300)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--ink-300)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: 'var(--slate-850)', border: '1px solid var(--slate-700)', borderRadius: 8 }} cursor={{ fill: 'var(--slate-800)' }} />
            <Bar dataKey="earnings" fill="var(--flame)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}
