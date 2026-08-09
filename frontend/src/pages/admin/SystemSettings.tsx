import type React from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { PageHeader, Panel, Button, tableStyles as t } from '../../components/ui';

export function SystemSettings() {
  const qc = useQueryClient();
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState('general');

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: async () => (await api.get('/admin/settings')).data.data });

  const save = useMutation({
    mutationFn: async () => {
      let parsed: any = value;
      try { parsed = JSON.parse(value); } catch { /* keep as string */ }
      return api.put('/admin/settings', { key, value: parsed, category });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); setKey(''); setValue(''); },
  });

  const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 14px', background: 'var(--slate-950)', border: '1px solid var(--slate-700)', borderRadius: 9, color: 'var(--ink-100)', fontSize: 14, marginBottom: 14 };

  return (
    <div>
      <PageHeader eyebrow="PLATFORM" title="System Settings" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 16 }}>
        <Panel title="Add / update setting">
          <input placeholder="key (e.g. support_email)" value={key} onChange={(e) => setKey(e.target.value)} style={inputStyle} />
          <input placeholder='value (text or JSON)' value={value} onChange={(e) => setValue(e.target.value)} style={inputStyle} />
          <input placeholder="category" value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle} />
          <Button onClick={() => save.mutate()} disabled={!key || save.isPending}>{save.isPending ? 'Saving…' : 'Save setting'}</Button>
        </Panel>

        <Panel title="Current settings">
          <div style={t.wrap}>
            <table style={t.table}>
              <thead><tr>{['Key', 'Value', 'Category'].map((h) => <th key={h} style={t.th}>{h}</th>)}</tr></thead>
              <tbody>
                {settings?.map((s: any) => (
                  <tr key={s.id}>
                    <td style={{ ...t.td, fontFamily: 'var(--mono)', color: 'var(--flame-soft)', fontSize: 12 }}>{s.key}</td>
                    <td style={{ ...t.td, fontFamily: 'var(--mono)', fontSize: 12 }}>{typeof s.value === 'object' ? JSON.stringify(s.value) : String(s.value)}</td>
                    <td style={{ ...t.td, color: 'var(--ink-300)', fontSize: 12 }}>{s.category}</td>
                  </tr>
                ))}
                {(!settings || settings.length === 0) && <tr><td colSpan={3} style={t.empty}>No settings configured yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
