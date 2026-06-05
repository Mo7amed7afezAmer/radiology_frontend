import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Report, Template, ReportItem } from '@/types';

// ─── Reports ─────────────────────────────────────────────────────────────────

export const useReports = () =>
  useQuery<Report[]>({
    queryKey: ['reports'],
    queryFn: async () => (await api.get('/reports')).data,
  });

export const useSignedReports = () =>
  useQuery<Report[]>({
    queryKey: ['reports', 'signed'],
    queryFn: async () => (await api.get('/reports/signed')).data,
  });

export const useReport = (id: number) =>
  useQuery<Report>({
    queryKey: ['reports', id],
    queryFn: async () => (await api.get(`/reports/${id}`)).data,
    enabled: !!id,
  });

export const useCreateReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Report> & { items?: Partial<ReportItem>[]; templateId?: number }) =>
      api.post('/reports', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  });
};

export const useUpdateReport = (id: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Report> & { items?: Partial<ReportItem>[] }) =>
      api.put(`/reports/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['reports', id] });
    },
  });
};

export const useSignReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.patch(`/reports/${id}/sign`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  });
};

export const useDeleteReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/reports/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  });
};

// ─── Templates ───────────────────────────────────────────────────────────────

export const useTemplates = () =>
  useQuery<Template[]>({
    queryKey: ['templates'],
    queryFn: async () => (await api.get('/templates')).data,
  });

export const useTemplate = (id: number) =>
  useQuery<Template>({
    queryKey: ['templates', id],
    queryFn: async () => (await api.get(`/templates/${id}`)).data,
    enabled: !!id,
  });

export const useCreateTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Template>) =>
      api.post('/templates', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });
};

export const useUpdateTemplate = (id: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Template>) =>
      api.put(`/templates/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      qc.invalidateQueries({ queryKey: ['templates', id] });
    },
  });
};

export const useDeleteTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/templates/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });
};
