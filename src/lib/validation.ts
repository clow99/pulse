import { z } from 'zod';

export const collectPayloadSchema = z.object({
  token: z.string().min(1),
  type: z.enum(['pageview', 'event', 'web_vital']),
  visitId: z.string().max(100).optional(),
  name: z.string().max(200).optional(),
  properties: z.record(
    z.string().max(100),
    z.union([z.string().max(500), z.number(), z.boolean(), z.null()])
  ).refine((properties) => Object.keys(properties).length <= 25, 'Events support at most 25 properties').optional(),
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

const slugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and dashes');

export const projectSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(1).max(120),
  slug: slugSchema,
  description: z.string().max(500).nullable().optional(),
  active: z.boolean().optional().default(true),
});

export const projectUpdateSchema = projectSchema.omit({ orgId: true }).partial();

export const environmentSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug: slugSchema,
  kind: z.enum(['production', 'staging', 'development', 'other']).default('production'),
});

export const serviceSchema = z.object({
  environmentId: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug: slugSchema,
  kind: z.enum(['web', 'api', 'worker', 'database', 'job', 'other']).default('web'),
});

export const monitorSchema = z.object({
  serviceId: z.string().uuid(),
  name: z.string().min(1).max(120),
  type: z.enum(['http', 'heartbeat', 'ssl_expiry', 'domain_expiry']),
  enabled: z.boolean().optional().default(true),
  intervalSeconds: z.coerce.number().int().min(60).max(86400).optional().default(300),
  graceSeconds: z.coerce.number().int().min(0).max(86400).optional().default(60),
  timeoutMs: z.coerce.number().int().min(1000).max(30000).optional().default(10000),
  url: z.string().url().max(2000).optional(),
  method: z.enum(['GET', 'HEAD']).optional().default('HEAD'),
  expectedStatusMin: z.coerce.number().int().min(100).max(599).optional().default(200),
  expectedStatusMax: z.coerce.number().int().min(100).max(599).optional().default(399),
  bodyContains: z.string().max(500).nullable().optional(),
  warningDays: z.coerce.number().int().min(1).max(365).optional().default(30),
}).superRefine((data, ctx) => {
  if (data.type !== 'heartbeat' && !data.url) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['url'], message: 'URL is required for this monitor type' });
  }
  if (data.expectedStatusMin > data.expectedStatusMax) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['expectedStatusMax'], message: 'Maximum status must be at least the minimum status' });
  }
});

export const monitorUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  enabled: z.boolean().optional(),
  intervalSeconds: z.coerce.number().int().min(60).max(86400).optional(),
  graceSeconds: z.coerce.number().int().min(0).max(86400).optional(),
  timeoutMs: z.coerce.number().int().min(1000).max(30000).optional(),
  url: z.string().url().max(2000).optional(),
  method: z.enum(['GET', 'HEAD']).optional(),
  expectedStatusMin: z.coerce.number().int().min(100).max(599).optional(),
  expectedStatusMax: z.coerce.number().int().min(100).max(599).optional(),
  bodyContains: z.string().max(500).nullable().optional(),
  warningDays: z.coerce.number().int().min(1).max(365).optional(),
});

export const deploymentSchema = z.object({
  environmentId: z.string().uuid(),
  serviceId: z.string().uuid().nullable().optional(),
  commitSha: z.string().min(7).max(64).nullable().optional(),
  version: z.string().max(120).nullable().optional(),
  status: z.enum(['started', 'succeeded', 'failed', 'rolled_back']).optional().default('succeeded'),
  source: z.string().min(1).max(80).optional().default('manual'),
  url: z.string().url().max(2000).nullable().optional(),
  deployedAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const organizationIntelligenceSchema = z.object({
  timezone: z.string().min(1).max(100),
  dailyBriefEnabled: z.boolean(),
  dailyBriefHour: z.coerce.number().int().min(0).max(23),
});
