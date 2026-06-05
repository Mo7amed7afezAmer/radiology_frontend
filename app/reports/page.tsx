'use client';
import { AppShell } from '@/components/layout/AppShell';
import { WorklistView } from '@/components/worklist/WorklistView';

export default function ReportsPage() {
  return (
    <AppShell>
      <WorklistView />
    </AppShell>
  );
}
