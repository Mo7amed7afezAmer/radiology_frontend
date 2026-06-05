'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { FileText, Plus, Sparkles, BookOpen } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to workstation for new reports
    const timer = setTimeout(() => {
      router.push('/workstation');
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-4">
        <div className="text-center space-y-4 max-w-2xl">
          <h1 className="text-5xl font-bold text-slate-900">Welcome to DOCNILE</h1>
          <p className="text-lg text-slate-600">Clinical Radiology Reporting Workstation</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 w-full max-w-2xl">
          <button
            onClick={() => router.push('/workstation')}
            className="p-6 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition text-left"
          >
            <Plus className="w-8 h-8 mb-2 text-blue-600" />
            <h2 className="font-semibold text-slate-900 mb-1">New Report</h2>
            <p className="text-sm text-slate-600">Create a new radiology report</p>
          </button>
          
          <button
            onClick={() => router.push('/worklist')}
            className="p-6 border border-slate-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition text-left"
          >
            <FileText className="w-8 h-8 mb-2 text-green-600" />
            <h2 className="font-semibold text-slate-900 mb-1">Worklist</h2>
            <p className="text-sm text-slate-600">View pending reports</p>
          </button>
          
          <button
            onClick={() => router.push('/templates')}
            className="p-6 border border-slate-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition text-left"
          >
            <Sparkles className="w-8 h-8 mb-2 text-purple-600" />
            <h2 className="font-semibold text-slate-900 mb-1">Templates</h2>
            <p className="text-sm text-slate-600">Manage report templates</p>
          </button>
          
          <button
            onClick={() => router.push('/reports')}
            className="p-6 border border-slate-200 rounded-lg hover:bg-orange-50 hover:border-orange-300 transition text-left"
          >
            <BookOpen className="w-8 h-8 mb-2 text-orange-600" />
            <h2 className="font-semibold text-slate-900 mb-1">Archive</h2>
            <p className="text-sm text-slate-600">View completed reports</p>
          </button>
        </div>

        <p className="text-sm text-slate-500 mt-8">Redirecting to workstation...</p>
      </div>
    </AppShell>
  );
}
