import type React from 'react';

export function PageHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
      <div>
        <div style={{ fontSize: 10, letterSpacing: 2, color: 'var(--flame-soft)', marginBottom: 6, fontFamily: 'var(--mono)' }}>{eyebrow}</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, fontFamily: 'var(--display)', color: 'var(--ink-100)' }}>{title}</h1>
      </div>
      {action}
    </header>
  );
}

export function MetricCard({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div style={{ background: 'var(--slate-900)', border: '1px solid var(--slate-800)', borderRadius: 12, padding: 20 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent ?? 'var(--flame)', marginBottom: 14 }} />
      <div style={{ fontSize: 26, fontWeight: 600, color: 'var(--ink-100)', letterSpacing: -0.5, fontFamily: 'var(--mono)' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-300)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

export function Panel({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--slate-900)', border: '1px solid var(--slate-800)', borderRadius: 12, padding: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-200)' }}>{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

export const tableStyles = {
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { textAlign: 'left' as const, padding: '13px 18px', fontSize: 10, letterSpacing: 1, color: 'var(--ink-300)', fontFamily: 'var(--mono)', background: 'var(--slate-850)' },
  td: { padding: '13px 18px', fontSize: 13, color: 'var(--ink-100)', borderTop: '1px solid var(--slate-800)' },
  wrap: { background: 'var(--slate-900)', border: '1px solid var(--slate-800)', borderRadius: 12, overflow: 'hidden' },
  empty: { padding: '48px', textAlign: 'center' as const, color: 'var(--ink-300)', fontSize: 14 },
};

export function Button({ children, onClick, variant = 'primary', disabled, type }: { children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost'; disabled?: boolean; type?: 'button' | 'submit' }) {
  const base: React.CSSProperties = { padding: '10px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', border: 'none', fontFamily: 'var(--display)', opacity: disabled ? 0.5 : 1 };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--flame)', color: 'var(--slate-950)' },
    ghost: { background: 'var(--slate-800)', color: 'var(--ink-100)', border: '1px solid var(--slate-700)' },
  };
  return <button type={type ?? 'button'} onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>{children}</button>;
}
