import type React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Building2, Boxes, Flame, LogOut, Users, Bike,
  DollarSign, Scale, FileClock, Percent, Settings, Tag, UserSquare2, Receipt,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';

const ADMIN_NAV = [
  { to: '/admin', icon: LayoutDashboard, label: 'Platform Overview', end: true },
  { to: '/admin/stations', icon: Building2, label: 'Stations' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/riders', icon: Bike, label: 'Rider Monitoring' },
  { to: '/admin/financials', icon: DollarSign, label: 'Financial Reporting' },
  { to: '/admin/disputes', icon: Scale, label: 'Disputes' },
  { to: '/admin/audit', icon: FileClock, label: 'Audit Logs' },
  { to: '/admin/commission', icon: Percent, label: 'Commission' },
  { to: '/admin/settings', icon: Settings, label: 'System Settings' },
];

const STATION_NAV = [
  { to: '/station', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/station/orders', icon: Package, label: 'Order Fulfillment' },
  { to: '/station/inventory', icon: Boxes, label: 'Inventory' },
  { to: '/station/pricing', icon: Tag, label: 'Pricing' },
  { to: '/station/riders', icon: Bike, label: 'Riders' },
  { to: '/station/customers', icon: UserSquare2, label: 'Customers' },
  { to: '/station/revenue', icon: Receipt, label: 'Revenue' },
];

export function DashboardLayout({ variant }: { variant: 'admin' | 'station' }) {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const nav = variant === 'admin' ? ADMIN_NAV : STATION_NAV;
  const consoleLabel = variant === 'admin' ? 'SUPER ADMIN' : 'STATION CONSOLE';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.brandMark}>
            <Flame size={20} color="var(--slate-950)" strokeWidth={2.5} />
          </div>
          <div>
            <div style={styles.brandName} className="display">POWERGAS</div>
            <div style={styles.brandSub} className="mono">{consoleLabel}</div>
          </div>
        </div>

        <nav style={styles.nav}>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({ ...styles.navItem, ...(isActive ? styles.navItemActive : {}) })}
            >
              <item.icon size={17} strokeWidth={2} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userBadge}>
            <div style={styles.userAvatar} className="mono">
              {user?.firstName?.[0] ?? 'U'}{user?.lastName?.[0] ?? ''}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={styles.userName}>{user?.firstName ?? 'User'}</div>
              <div style={styles.userRole} className="mono">{user?.role ?? ''}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn} aria-label="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: { display: 'flex', minHeight: '100vh', background: 'var(--slate-950)' },
  sidebar: {
    width: 252, flexShrink: 0, background: 'var(--slate-900)', borderRight: '1px solid var(--slate-800)',
    display: 'flex', flexDirection: 'column', padding: '24px 16px', position: 'sticky', top: 0, height: '100vh',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 12, padding: '0 8px 24px' },
  brandMark: { width: 36, height: 36, borderRadius: 9, background: 'var(--flame)', display: 'grid', placeItems: 'center', boxShadow: '0 0 18px var(--flame-glow)' },
  brandName: { fontSize: 15, fontWeight: 800, letterSpacing: 1, color: 'var(--ink-100)' },
  brandSub: { fontSize: 9, letterSpacing: 2, color: 'var(--flame-soft)', marginTop: 2 },
  nav: { display: 'flex', flexDirection: 'column', gap: 3, flex: 1, marginTop: 8, overflowY: 'auto' },
  navItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 9, color: 'var(--ink-300)', textDecoration: 'none', fontSize: 13.5, fontWeight: 500, transition: 'all 0.15s' },
  navItemActive: { background: 'var(--slate-800)', color: 'var(--ink-100)', boxShadow: 'inset 2px 0 0 var(--flame)' },
  sidebarFooter: { display: 'flex', alignItems: 'center', gap: 8, paddingTop: 16, borderTop: '1px solid var(--slate-800)' },
  userBadge: { display: 'flex', alignItems: 'center', gap: 10, flex: 1, overflow: 'hidden' },
  userAvatar: { width: 34, height: 34, borderRadius: 8, background: 'var(--slate-700)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600, color: 'var(--ink-100)', flexShrink: 0 },
  userName: { fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  userRole: { fontSize: 9, color: 'var(--ink-300)', letterSpacing: 0.5 },
  logoutBtn: { background: 'transparent', border: '1px solid var(--slate-700)', color: 'var(--ink-300)', width: 34, height: 34, borderRadius: 8, cursor: 'pointer', display: 'grid', placeItems: 'center' },
  main: { flex: 1, padding: '32px 40px', overflowY: 'auto', maxWidth: 1500 },
};
