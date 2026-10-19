import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  pageSize: z.coerce.number().int().min(1).max(100).default(20),

  search: z.string().optional(),
});

export const dateRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export function paged<T>(items: T[], total: number, page: number, pageSize: number) {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export const listQuerySchema = paginationSchema.extend({
  sort: z.string().optional(),
  dir: z.enum(['asc', 'desc']).default('desc'),
});

export const productCreateSchema = z.object({
  name: z.string().min(2).max(120),
  sku: z.string().min(2).max(40),
  price: z.coerce.number().nonnegative(),
  active: z.coerce.number().int().min(0).max(1).default(1),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
});

export const productUpdateSchema = productCreateSchema.partial();

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const orderListQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const customerCreateSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().nullable().optional().or(z.literal('')),
  document: z.string().max(40).nullable().optional().or(z.literal('')),
});

export const customerUpdateSchema = customerCreateSchema.partial();

export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(120),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6).max(120),
});

export const organizationUpdateSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífen'),
});

export const membershipCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(120),
  password: z.string().min(6).max(120),
  role: z.enum(['VIEWER', 'ANALYST', 'MANAGER', 'ADMIN']),
});

export const membershipUpdateSchema = z.object({
  role: z.enum(['VIEWER', 'ANALYST', 'MANAGER', 'ADMIN']),
});
