'use client';
import { AppShell } from '@/components/layout/AppShell';
import { WorkstationView } from '@/components/workstation/WorkstationView';

export default function WorkstationPage() {
  return (
    <AppShell>
      <WorkstationView />
    </AppShell>
  );
}
