import type React from 'react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { PageHeader, tableStyles as t } from '../../components/ui';
import { StatusBadge } from '../../components/StatusBadge';

export function UsersManagement() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['users', page],
    queryFn: async () => (await api.get(`/admin/users?page=${page}&limit=25`)).data.data,
  });

  return (
    <div>
      <PageHeader eyebrow="ACCESS" title="Users" />
      <div style={t.wrap}>
        <table style={t.table}>
          <thead><tr>{['Name', 'Email', 'Role', 'Status', 'Joined'].map((h) => <th key={h} style={t.th}>{h}</th>)}</tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} style={t.empty}>Loading…</td></tr>}
            {data?.items?.map((u: any) => (
              <tr key={u.id}>
                <td style={t.td}>{u.firstName} {u.lastName}</td>
                <td style={{ ...t.td, color: 'var(--ink-300)' }}>{u.email}</td>
                <td style={{ ...t.td, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--flame-soft)' }}>{u.role}</td>
                <td style={t.td}><StatusBadge status={u.status} /></td>
                <td style={{ ...t.td, color: 'var(--ink-300)', fontFamily: 'var(--mono)', fontSize: 12 }}>{new Date(u.createdAt).toLocaleDateString()}</td>
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
