import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  update: vi.fn(),
  safeFetch: vi.fn(),
  getReportData: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: { scheduledReport: { findMany: mocks.findMany, update: mocks.update } } }));
vi.mock('@/lib/safe-fetch', () => ({ safeFetch: mocks.safeFetch }));
vi.mock('@/lib/report-catalog', () => ({ normalizeProductReport: (kind: string) => kind }));
vi.mock('@/lib/reports', () => ({
  defaultDateRange: () => ({ fromDate: new Date('2026-01-01Z'), toDate: new Date('2026-01-02Z') }),
  getReportData: mocks.getReportData,
}));

const report = {
  id: 'synthetic-report',
  siteId: 'synthetic-site',
  name: 'Weekly analytics',
  reports: ['overview'],
  channelType: 'webhook',
  target: 'https://reports.example.invalid/pulse',
  frequency: 'weekly',
  site: { name: 'Synthetic site', domain: 'example.invalid' },
};

function request(authorized = true) {
  return new Request('https://pulse.example.invalid/api/scheduled-reports/run', {
    method: 'POST',
    headers: authorized ? { authorization: 'Bearer synthetic-scheduler-secret' } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('SCHEDULED_REPORT_SECRET', 'synthetic-scheduler-secret');
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Unchecked fetch must never run'); }));
  mocks.findMany.mockResolvedValue([report]);
  mocks.update.mockResolvedValue({});
  mocks.getReportData.mockResolvedValue({ pageviews: 3 });
  mocks.safeFetch.mockResolvedValue(new Response(null, { status: 204 }));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('scheduled-report webhook execution', () => {
  it('revalidates the stored target at delivery with a deadline and no redirects', async () => {
    const signal = new AbortController().signal;
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(signal);
    const result = await POST(request());
    expect(await result.json()).toEqual({ evaluated: 1, results: [{ id: report.id, status: 'sent' }] });
    expect(timeout).toHaveBeenCalledWith(10_000);
    expect(mocks.safeFetch).toHaveBeenCalledWith(report.target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: report.name,
        site: report.site,
        range: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' },
        reports: ['overview'],
        data: { overview: { pageviews: 3 } },
      }),
      signal,
    }, 0);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: report.id } }));
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    'URL resolves to a blocked network address',
    'Too many redirects',
    'Synthetic timeout',
  ])('does not mark a report sent when guarded delivery fails: %s', async (message) => {
    mocks.safeFetch.mockRejectedValueOnce(new Error(message));
    const result = await POST(request());
    expect(await result.json()).toEqual({ evaluated: 1, results: [{ id: report.id, status: 'failed', error: message }] });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('releases an unread webhook response body', async () => {
    const cancel = vi.fn();
    mocks.safeFetch.mockResolvedValue({ ok: true, status: 200, body: { cancel } });
    await POST(request());
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('preserves HTTP failure reporting without marking a report sent', async () => {
    mocks.safeFetch.mockResolvedValue(new Response(null, { status: 503 }));
    const result = await POST(request());
    expect(await result.json()).toEqual({ evaluated: 1, results: [{ id: report.id, status: 'failed', error: 'Webhook delivery failed with HTTP 503' }] });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('rejects unauthorized execution before reading reports or sending webhooks', async () => {
    const result = await POST(request(false));
    expect(result.status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.safeFetch).not.toHaveBeenCalled();
  });
});
