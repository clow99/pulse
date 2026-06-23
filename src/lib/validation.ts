import { z } from 'zod';

export const collectPayloadSchema = z.object({
  token: z.string().min(1),
  type: z.enum(['pageview', 'event', 'web_vital']),
  visitId: z.string().max(100).optional(),
  name: z.string().max(200).optional(),
  properties: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), z.null()])
  ).optional(),
  url: z.string().url().max(2000),
  referrer: z.string().max(2000).optional().default(''),
  utm_source: z.string().max(200).optional().default(''),
  utm_medium: z.string().max(200).optional().default(''),
  utm_campaign: z.string().max(200).optional().default(''),
  value: z.number().finite().optional(),
  rating: z.string().max(40).optional(),
});

export type CollectPayload = z.infer<typeof collectPayloadSchema>;

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export const registerRequestSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
});

export const registerSchema = registerRequestSchema.extend({
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
  collectWebVitals: z.boolean().optional(),
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

export const notificationChannelSchema = z.object({
  orgId: z.string().uuid(),
  type: z.enum(['email', 'webhook']),
  name: z.string().min(1).max(100),
  target: z.string().min(3).max(500),
  enabled: z.boolean().optional().default(true),
});

export const alertRuleSchema = z.object({
  siteId: z.string().uuid(),
  notificationChannelId: z.string().uuid(),
  enabled: z.boolean().optional().default(true),
  consecutiveFailures: z.coerce.number().int().min(1).max(10).optional().default(2),
  recoveryChecks: z.coerce.number().int().min(1).max(10).optional().default(1),
});

export const statusPageSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional().nullable(),
  enabled: z.boolean().optional().default(true),
  components: z.array(z.object({
    siteId: z.string().uuid(),
    name: z.string().min(1).max(100),
  })).optional().default([]),
});

export const goalSchema = z.object({
  siteId: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: z.enum(['pageview', 'event']),
  matchType: z.enum(['exact', 'prefix']).optional().default('exact'),
  path: z.string().max(500).optional().nullable(),
  eventName: z.string().max(200).optional().nullable(),
  propertyKey: z.string().max(100).optional().nullable(),
  propertyValue: z.string().max(200).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.type === 'pageview' && !data.path) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Path is required for page goals', path: ['path'] });
  }
  if (data.type === 'event' && !data.eventName) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Event name is required for event goals', path: ['eventName'] });
  }
});

export const funnelSchema = z.object({
  siteId: z.string().uuid(),
  name: z.string().min(1).max(100),
  mode: z.enum(['sequential', 'strict']).optional().default('sequential'),
  goalIds: z.array(z.string().uuid()).min(2).max(8),
});
