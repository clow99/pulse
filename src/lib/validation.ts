import { z } from 'zod';

export const collectPayloadSchema = z.object({
  token: z.string().min(1),
  type: z.enum(['pageview', 'event']),
  name: z.string().max(200).optional(),
  properties: z.record(z.string(), z.string()).optional(),
  url: z.string().url().max(2000),
  referrer: z.string().max(2000).optional().default(''),
  utm_source: z.string().max(200).optional().default(''),
  utm_medium: z.string().max(200).optional().default(''),
  utm_campaign: z.string().max(200).optional().default(''),
});

export type CollectPayload = z.infer<typeof collectPayloadSchema>;

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const createOrgSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and dashes'),
});

export const createSiteSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  domain: z
    .string()
    .min(1, 'Domain is required')
    .max(253)
    .regex(
      /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/,
      'Please enter a valid domain (e.g. example.com)'
    ),
});

export const reportFiltersSchema = z.object({
  siteId: z.string().uuid(),
  from: z.string().datetime(),
  to: z.string().datetime(),
  dimension: z.string().optional(),
  dimensionValue: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().max(200).optional(),
});
