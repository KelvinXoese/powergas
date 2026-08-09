import type React from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Users } from 'lucide-react';
import { api } from '../../services/api';
import { PageHeader, Button } from '../../components/ui';
import { StatusBadge } from '../../components/StatusBadge';

export function StationsManagement() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', fullAddress: '', city: '', region: '' });
  const [staffFor, setStaffFor] = useState<any | null>(null);

  const { data } = useQuery({ queryKey: ['stations'], queryFn: async () => (await api.get('/stations?limit=100')).data.data.items });

  const create = useMutation({
    mutationFn: async () => api.post('/stations', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stations'] }); setShowForm(false); setForm({ name: '', fullAddress: '', city: '', region: '' }); },
  });

  const review = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'VERIFIED' | 'REJECTED' }) =>
      api.patch(`/stations/${id}/verification`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stations'] }),
  });

  return (
    <div>
      <PageHeader eyebrow="NETWORK" title="Stations"
        action={<Button onClick={() => setShowForm((s) => !s)}><Plus size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />New station</Button>} />

      {showForm && (
        <div style={{ background: 'var(--slate-900)', border: '1px solid var(--slate-800)', borderRadius: 12, padding: 22, marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {(['name', 'fullAddress', 'city', 'region'] as const).map((k) => (
            <input key={k} placeholder={k} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
              style={{ padding: '11px 14px', background: 'var(--slate-950)', border: '1px solid var(--slate-700)', borderRadius: 9, color: 'var(--ink-100)', fontSize: 14 }} />
          ))}
          <div style={{ gridColumn: '1 / -1' }}>
            <Button onClick={() => create.mutate()} disabled={create.isPending || !form.name}>{create.isPending ? 'Creating…' : 'Create station'}</Button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {data?.map((s: any) => (
          <div key={s.id} style={{ background: 'var(--slate-900)', border: '1px solid var(--slate-800)', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--slate-800)', display: 'grid', placeItems: 'center', color: 'var(--flame)' }}><MapPin size={18} /></div>
              <StatusBadge status={s.status} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{s.name}</div>
            <div style={{ fontSize: 12, color: 'var(--flame-soft)', fontFamily: 'var(--mono)', marginBottom: 12 }}>{s.code}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-300)', borderTop: '1px solid var(--slate-800)', paddingTop: 12, marginBottom: 12 }}>
              <span>{s.city || '—'}</span>
              <span className="mono">★ {Number(s.averageRating).toFixed(1)} · {s.deliveryRadiusKm}km</span>
            </div>

            {s.status === 'PENDING' && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button
                  onClick={() => review.mutate({ id: s.id, status: 'VERIFIED' })}
                  disabled={review.isPending}
                  style={{ flex: 1, padding: '8px', background: 'rgba(45,212,191,0.12)', border: '1px solid var(--teal)', borderRadius: 8, color: 'var(--teal)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  Approve
                </button>
                <button
                  onClick={() => review.mutate({ id: s.id, status: 'REJECTED' })}
                  disabled={review.isPending}
                  style={{ flex: 1, padding: '8px', background: 'rgba(244,63,94,0.12)', border: '1px solid var(--rose)', borderRadius: 8, color: 'var(--rose)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  Reject
                </button>
              </div>
            )}

            {(s.businessLicenseUrl || s.safetyCertificateUrl || s.cylinderInspectionCertUrl) && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 11 }}>
                {s.businessLicenseUrl && <a href={s.businessLicenseUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--flame-soft)' }}>License</a>}
                {s.safetyCertificateUrl && <a href={s.safetyCertificateUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--flame-soft)' }}>Safety cert</a>}
                {s.cylinderInspectionCertUrl && <a href={s.cylinderInspectionCertUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--flame-soft)' }}>Inspection cert</a>}
              </div>
            )}

            <button onClick={() => setStaffFor(s)} style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', justifyContent: 'center', padding: '8px', background: 'var(--slate-800)', border: '1px solid var(--slate-700)', borderRadius: 8, color: 'var(--ink-200)', fontSize: 12, cursor: 'pointer' }}>
              <Users size={14} /> Manage staff
            </button>
          </div>
        ))}
      </div>

      {staffFor && <StaffModal station={staffFor} onClose={() => setStaffFor(null)} />}
    </div>
  );
}

function StaffModal({ station, onClose }: { station: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('STATION_MANAGER');

  const { data: staff } = useQuery({
    queryKey: ['station-staff', station.id],
    queryFn: async () => (await api.get(`/stations/${station.id}/staff`)).data.data,
  });

  const assign = useMutation({
    mutationFn: async () => api.post(`/stations/${station.id}/staff`, { userId, role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['station-staff', station.id] }); setUserId(''); },
  });

  const remove = useMutation({
    mutationFn: async (uid: string) => api.delete(`/stations/${station.id}/staff/${uid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['station-staff', station.id] }),
  });

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Staff — {station.name}</h3>
        <p style={{ fontSize: 12, color: 'var(--ink-300)', marginBottom: 18, fontFamily: 'var(--mono)' }}>{station.code}</p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <input placeholder="User ID to assign" value={userId} onChange={(e) => setUserId(e.target.value)}
            style={{ flex: 1, padding: '10px 12px', background: 'var(--slate-950)', border: '1px solid var(--slate-700)', borderRadius: 8, color: 'var(--ink-100)', fontSize: 13, fontFamily: 'var(--mono)' }} />
          <select value={role} onChange={(e) => setRole(e.target.value)}
            style={{ padding: '10px 12px', background: 'var(--slate-950)', border: '1px solid var(--slate-700)', borderRadius: 8, color: 'var(--ink-100)', fontSize: 13 }}>
            <option value="STATION_MANAGER">Manager</option>
            <option value="STATION_STAFF">Staff</option>
          </select>
          <Button onClick={() => assign.mutate()} disabled={!userId || assign.isPending}>Assign</Button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {staff?.length === 0 && <div style={{ color: 'var(--ink-300)', fontSize: 13 }}>No staff assigned yet.</div>}
          {staff?.map((m: any) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--slate-950)', borderRadius: 8 }}>
              <div>
                <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-200)' }}>{m.userId.slice(0, 16)}…</div>
                <div style={{ fontSize: 10, color: 'var(--flame-soft)', fontFamily: 'var(--mono)', marginTop: 2 }}>{m.role}</div>
              </div>
              <button onClick={() => remove.mutate(m.userId)} style={{ background: 'transparent', border: '1px solid var(--slate-700)', color: 'var(--rose)', borderRadius: 7, padding: '5px 10px', fontSize: 11, cursor: 'pointer' }}>Remove</button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, textAlign: 'right' }}>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center', zIndex: 50 };
const modal: React.CSSProperties = { width: 480, background: 'var(--slate-900)', border: '1px solid var(--slate-700)', borderRadius: 14, padding: 26 };
