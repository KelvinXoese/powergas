const STATUS_COLORS: Record<string, string> = {
  PENDING: 'var(--ink-300)',
  ACCEPTED: 'var(--blue)',
  PREPARING: 'var(--amber)',
  RIDER_ASSIGNED: 'var(--blue)',
  RIDER_EN_ROUTE_DELIVERY: 'var(--blue)',
  DELIVERED: 'var(--teal)',
  COMPLETED: 'var(--teal)',
  CANCELLED: 'var(--rose)',
  REFUNDED: 'var(--rose)',
  AVAILABLE: 'var(--teal)',
  VERIFIED: 'var(--teal)',
};

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? 'var(--ink-300)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
      borderRadius: 6, fontSize: 11, fontWeight: 500, fontFamily: 'var(--mono)',
      color, background: 'var(--slate-850)', border: `1px solid ${color}33`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
      {status.replace(/_/g, ' ')}
    </span>
  );
}
