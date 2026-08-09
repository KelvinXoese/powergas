import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useStationId } from '../../hooks/useStation';
import { PageHeader, Panel, Button } from '../../components/ui';

interface PriceForm { exchangePrice: string; newPrice: string; refillPrice: string; emergencySurcharge: string; }

export function StationPricing() {
  const { data: stationId } = useStationId();
  const qc = useQueryClient();
  const [selectedType, setSelectedType] = useState<string>('');
  const [form, setForm] = useState<PriceForm>({ exchangePrice: '', newPrice: '', refillPrice: '', emergencySurcharge: '' });
  const [saved, setSaved] = useState(false);

  const { data: types } = useQuery({ queryKey: ['types'], queryFn: async () => (await api.get('/inventory/types')).data.data });
  const { data: inventory } = useQuery({
    queryKey: ['station-inventory', stationId],
    enabled: !!stationId,
    queryFn: async () => (await api.get(`/inventory/station/${stationId}`)).data.data,
  });

  useEffect(() => {
    if (types?.length && !selectedType) setSelectedType(types[0].id);
  }, [types, selectedType]);

  // Prefill from existing inventory pricing when type changes
  useEffect(() => {
    const inv = inventory?.find((i: any) => i.cylinderTypeId === selectedType);
    if (inv) {
      setForm({
        exchangePrice: String(inv.exchangePrice ?? ''),
        newPrice: String(inv.newPrice ?? ''),
        refillPrice: String(inv.refillPrice ?? ''),
        emergencySurcharge: String(inv.emergencySurcharge ?? ''),
      });
    }
  }, [selectedType, inventory]);

  const save = useMutation({
    mutationFn: async () => api.put(`/inventory/station/${stationId}/pricing`, {
      cylinderTypeId: selectedType,
      exchangePrice: Number(form.exchangePrice || 0),
      newPrice: Number(form.newPrice || 0),
      refillPrice: Number(form.refillPrice || 0),
      emergencySurcharge: Number(form.emergencySurcharge || 0),
    }),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      qc.invalidateQueries({ queryKey: ['station-inventory'] });
      qc.invalidateQueries({ queryKey: ['pricing-history'] });
    },
  });

  const { data: history } = useQuery({
    queryKey: ['pricing-history', stationId],
    enabled: !!stationId,
    queryFn: async () => (await api.get(`/inventory/station/${stationId}/pricing-history`)).data.data,
  });

  const field = (label: string, key: keyof PriceForm, hint: string) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--ink-300)', marginBottom: 6 }}>{label}<span style={{ color: 'var(--ink-300)', opacity: 0.6 }}> · {hint}</span></label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--slate-950)', border: '1px solid var(--slate-700)', borderRadius: 9, padding: '0 14px' }}>
        <span style={{ color: 'var(--ink-300)', fontFamily: 'var(--mono)', fontSize: 13 }}>GHS</span>
        <input
          type="number" min="0" step="0.01"
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          style={{ flex: 1, padding: '11px 0', background: 'transparent', border: 'none', color: 'var(--ink-100)', fontSize: 15, fontFamily: 'var(--mono)', outline: 'none' }}
        />
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader eyebrow="PRICING MANAGEMENT" title="Pricing"
        action={<Button onClick={() => save.mutate()} disabled={!selectedType || save.isPending}>{save.isPending ? 'Saving…' : saved ? 'Saved ✓' : 'Save prices'}</Button>} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Panel title="Set prices per cylinder type">
          <label style={{ display: 'block', fontSize: 11, color: 'var(--ink-300)', marginBottom: 6 }}>Cylinder type</label>
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}
            style={{ width: '100%', padding: '11px 14px', background: 'var(--slate-950)', border: '1px solid var(--slate-700)', borderRadius: 9, color: 'var(--ink-100)', fontSize: 14, marginBottom: 20 }}>
            {types?.map((tp: any) => <option key={tp.id} value={tp.id}>{tp.name} ({tp.weightKg}kg)</option>)}
          </select>
          {field('Exchange price', 'exchangePrice', 'swap empty for filled')}
          {field('New cylinder price', 'newPrice', 'cylinder + gas')}
          {field('Refill price', 'refillPrice', 'refill customer cylinder')}
          {field('Express surcharge', 'emergencySurcharge', 'added when customer chooses express delivery')}
        </Panel>

        <Panel title="Recent price changes">
          {(!history || history.length === 0) ? (
            <div style={{ color: 'var(--ink-300)', fontSize: 13, padding: '20px 0' }}>No pricing history yet. Saved changes appear here for audit.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.slice(0, 8).map((h: any) => (
                <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--slate-800)', fontSize: 12 }}>
                  <span style={{ color: 'var(--ink-300)', fontFamily: 'var(--mono)' }}>{new Date(h.createdAt).toLocaleString()}</span>
                  <span style={{ fontFamily: 'var(--mono)' }}>EX {Number(h.exchangePrice).toFixed(0)} · NEW {Number(h.newPrice).toFixed(0)} · RF {Number(h.refillPrice).toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
