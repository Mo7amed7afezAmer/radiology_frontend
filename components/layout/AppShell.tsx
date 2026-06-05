'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, init } = useAuthStore();
  const router = useRouter();

  useEffect(() => { init(); }, []);
  useEffect(() => {
    if (!localStorage.getItem('token')) router.replace('/login');
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: 60, flex: 1, minHeight: '100vh', background: 'var(--bg-base)', overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
