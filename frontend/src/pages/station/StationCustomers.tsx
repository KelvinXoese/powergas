import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useStationId } from '../../hooks/useStation';
import { PageHeader, tableStyles as t } from '../../components/ui';

export function StationCustomers() {
  const { data: stationId } = useStationId();
  const { data, isLoading } = useQuery({
    queryKey: ['station-customers', stationId],
    enabled: !!stationId,
    queryFn: async () => (await api.get(`/station-dashboard/${stationId}/customers?limit=50`)).data.data,
  });

  return (
    <div>
      <PageHeader eyebrow="RELATIONSHIPS" title="Customers" />
      <div style={t.wrap}>
        <table style={t.table}>
          <thead><tr>{['Customer', 'Orders', 'Total Spent', 'Last Order'].map((h) => <th key={h} style={t.th}>{h}</th>)}</tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={4} style={t.empty}>Loading…</td></tr>}
            {!isLoading && data?.items?.length === 0 && <tr><td colSpan={4} style={t.empty}>No customers yet.</td></tr>}
            {data?.items?.map((c: any) => (
              <tr key={c.customerId}>
                <td style={{ ...t.td, fontFamily: 'var(--mono)', color: 'var(--ink-300)', fontSize: 12 }}>{c.customerId.slice(0, 13)}…</td>
                <td style={{ ...t.td, fontFamily: 'var(--mono)' }}>{c.orderCount}</td>
                <td style={{ ...t.td, fontFamily: 'var(--mono)' }}>GHS {Number(c.totalSpent).toFixed(2)}</td>
                <td style={{ ...t.td, color: 'var(--ink-300)', fontFamily: 'var(--mono)', fontSize: 12 }}>{c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
