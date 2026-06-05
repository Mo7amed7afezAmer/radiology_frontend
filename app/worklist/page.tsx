'use client';
import { AppShell } from '@/components/layout/AppShell';
import { WorklistView } from '@/components/worklist/WorklistView';

export default function WorklistPage() {
  return (
    <AppShell>
      <WorklistView />
    </AppShell>
  );
}
