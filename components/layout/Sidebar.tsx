'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import {
  LayoutGrid, FileText, Layers, Users, Sparkles,
  BookOpen, LogOut, Plus, Settings,
} from 'lucide-react';

const navItems = [
  { href: '/workstation', icon: Plus, label: 'New Report', primary: true },
  { href: '/worklist', icon: FileText, label: 'Worklist' },
  { href: '/templates', icon: Layers, label: 'Templates' },
  { href: '/reports', icon: BookOpen, label: 'Archive' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('')
    : 'DR';

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-logo">D</div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map(({ href, icon: Icon, label, primary }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`nav-item ${active ? 'active' : ''} ${primary ? 'primary' : ''}`}
              title={label}
            >
              <Icon size={18} strokeWidth={1.8} />
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">
        <button className="nav-item" title="Settings">
          <Settings size={16} strokeWidth={1.8} />
        </button>
        <button
          className="user-avatar"
          onClick={handleLogout}
          title={`${user?.fullName} — Click to logout`}
        >
          {initials}
        </button>
      </div>

      <style jsx>{`
        .sidebar {
          width: 60px;
          height: 100vh;
          background: var(--bg-surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 0;
          position: fixed;
          left: 0; top: 0;
          z-index: 50;
          flex-shrink: 0;
        }
        .sidebar-brand {
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border-subtle);
          width: 100%;
          display: flex;
          justify-content: center;
        }
        .brand-logo {
          width: 34px; height: 34px;
          background: var(--accent);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 16px; color: white;
        }
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
          align-items: center;
          padding-top: 4px;
        }
        .nav-item {
          width: 38px; height: 38px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          color: var(--text-muted);
          text-decoration: none;
          transition: all 0.15s;
          border: none;
          background: none;
          cursor: pointer;
        }
        .nav-item:hover { background: var(--bg-elevated); color: var(--text-secondary); }
        .nav-item.active { background: var(--accent-dim); color: var(--accent); }
        .nav-item.primary {
          background: var(--accent);
          color: white;
          margin-bottom: 8px;
        }
        .nav-item.primary:hover { background: var(--accent-hover); }
        .sidebar-bottom {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding-top: 12px;
          border-top: 1px solid var(--border-subtle);
          width: 100%;
        }
        .user-avatar {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent), #7c3aed);
          color: white;
          font-size: 11px;
          font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          border: none;
          cursor: pointer;
          transition: transform 0.15s, opacity 0.15s;
        }
        .user-avatar:hover { transform: scale(1.05); opacity: 0.9; }
      `}</style>
    </aside>
  );
}
