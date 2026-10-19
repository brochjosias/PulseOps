'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api-client';

// ── Profile ─────────────────────────────────────────────────
export type Me = {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt?: string;
};

export function useMe() {
  return useQuery<Me>({
    queryKey: ['me'],
    queryFn: () => api<Me>('/api/me'),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string }) =>
      api<{ ok: true }>('/api/me', {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      api<{ ok: true }>('/api/me/password', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  });
}

// ── Organization ────────────────────────────────────────────
export type Organization = {
  id: number;
  name: string;
  slug: string;
  createdAt?: string;
};

export function useOrganization() {
  return useQuery<Organization>({
    queryKey: ['organization'],
    queryFn: () => api<Organization>('/api/organization'),
  });
}

export function useUpdateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; slug: string }) =>
      api<{ ok: true }>('/api/organization', {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organization'] }),
  });
}

// ── Members ─────────────────────────────────────────────────
export type Member = {
  id: number;
  userId: number;
  role: string;
  email: string;
  name: string;
  createdAt?: string;
};

export function useMembers() {
  return useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: () => api<Member[]>('/api/memberships'),
  });
}

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; name: string; password: string; role: string }) =>
      api<{ id: number }>('/api/memberships', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; role: string }) =>
      api<{ ok: true }>(`/api/memberships/${input.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: input.role }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<{ ok: true }>(`/api/memberships/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
}
