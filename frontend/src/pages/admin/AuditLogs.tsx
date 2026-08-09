import type React from 'react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { PageHeader, tableStyles as t } from '../../components/ui';

export function AuditLogs() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['audit', page],
    queryFn: async () => (await api.get(`/admin/audit-logs?page=${page}&limit=30`)).data.data,
  });

  return (
    <div>
      <PageHeader eyebrow="COMPLIANCE" title="Audit Logs" />
      <div style={t.wrap}>
        <table style={t.table}>
          <thead><tr>{['Action', 'Resource', 'User', 'IP', 'When'].map((h) => <th key={h} style={t.th}>{h}</th>)}</tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} style={t.empty}>Loading…</td></tr>}
            {!isLoading && data?.items?.length === 0 && <tr><td colSpan={5} style={t.empty}>No audit entries yet.</td></tr>}
            {data?.items?.map((a: any) => (
              <tr key={a.id}>
                <td style={{ ...t.td, fontFamily: 'var(--mono)', color: 'var(--flame-soft)', fontSize: 12 }}>{a.action}</td>
                <td style={{ ...t.td, fontSize: 12 }}>{a.resourceType}{a.resourceId ? ` · ${a.resourceId.slice(0, 8)}` : ''}</td>
                <td style={{ ...t.td, color: 'var(--ink-300)', fontFamily: 'var(--mono)', fontSize: 12 }}>{a.userId ? a.userId.slice(0, 8) : 'system'}</td>
                <td style={{ ...t.td, color: 'var(--ink-300)', fontFamily: 'var(--mono)', fontSize: 12 }}>{a.ipAddress ?? '—'}</td>
                <td style={{ ...t.td, color: 'var(--ink-300)', fontFamily: 'var(--mono)', fontSize: 12 }}>{new Date(a.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && data.totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <button style={pageBtn} disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
          <span style={{ padding: '8px 14px', color: 'var(--ink-300)', fontFamily: 'var(--mono)', fontSize: 13 }}>{page} / {data.totalPages}</span>
          <button style={pageBtn} disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
const pageBtn: React.CSSProperties = { padding: '8px 16px', background: 'var(--slate-800)', border: '1px solid var(--slate-700)', borderRadius: 8, color: 'var(--ink-100)', cursor: 'pointer', fontSize: 13 };
