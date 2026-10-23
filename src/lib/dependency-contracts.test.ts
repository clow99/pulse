import { describe, expect, it } from 'vitest';
import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import nodemailer from 'nodemailer';
import { registerPulseMcpTools } from './mcp-tools';
import { collectPayloadSchema, registerSchema } from './validation';

const handler = createMcpHandler(
  registerPulseMcpTools,
  { serverInfo: { name: 'pulse-analytics', version: '0.1.0' } },
  { basePath: '/api', disableSse: true },
);

function rpcRequest(method: string, params: Record<string, unknown> = {}) {
  return new Request('http://localhost/api/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': '2025-03-26',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
}

async function rpcResult(response: Response) {
  expect(response.status).toBe(200);
  const body = await response.text();
  const data = body.split(/\r?\n/).find((line) => line.startsWith('data: '));
  const message = JSON.parse(data ? data.slice(6) : body);
  expect(message.error).toBeUndefined();
  return message.result;
}

describe('patched dependency contracts', () => {
  it('preserves tracking defaults and bounded event-property validation', () => {
    const event = { token: 'synthetic-site', type: 'event', url: 'https://example.invalid/', name: 'checkout' };
    expect(collectPayloadSchema.parse(event)).toMatchObject({ referrer: '', utm_source: '' });
    expect(collectPayloadSchema.safeParse({ ...event, properties: { amount: 12, paid: true, coupon: null } }).success).toBe(true);
    const oversized = Object.fromEntries(Array.from({ length: 26 }, (_, index) => [`key${index}`, 'value']));
    expect(collectPayloadSchema.safeParse({ ...event, properties: oversized }).success).toBe(false);
  });

  it('keeps password-confirmation errors attached to the expected form field', () => {
    const result = registerSchema.safeParse({ name: 'Synthetic', email: 'test@example.invalid', password: 'Synthetic password 123!', confirmPassword: 'Different password 123!' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path: ['confirmPassword'], message: 'Passwords do not match' })]));
  });

  it('initializes the existing MCP HTTP handler and exposes Pulse tool schemas', async () => {
    const initialized = await rpcResult(await handler(rpcRequest('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'pulse-contract-test', version: '1.0.0' },
    })));
    expect(initialized.serverInfo.name).toBe('pulse-analytics');

    const listed = await rpcResult(await handler(rpcRequest('tools/list')));
    expect(listed.tools).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'get_overview' }),
      expect.objectContaining({ name: 'generate_report_data' }),
    ]));
    const overview = listed.tools.find((tool: { name: string }) => tool.name === 'get_overview');
    expect(overview.inputSchema.required).toContain('siteId');
  });

  it('keeps unauthenticated MCP requests behind the existing authentication wrapper', async () => {
    const authenticated = withMcpAuth(handler, async () => undefined, { required: true });
    const response = await authenticated(rpcRequest('tools/list'));
    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toContain('Bearer');
  });

  it('composes notification email without connecting to SMTP or sending a message', async () => {
    const transport = nodemailer.createTransport({ jsonTransport: true });
    const result = await transport.sendMail({
      from: 'Pulse <sender@example.invalid>',
      to: 'recipient@example.invalid',
      subject: '[Pulse] Synthetic notification',
      text: 'Notification contract check.',
    });
    const message = typeof result.message === 'string' ? JSON.parse(result.message) : result.message;
    expect(message.subject).toBe('[Pulse] Synthetic notification');
    expect(message.to).toEqual([{ address: 'recipient@example.invalid', name: '' }]);
    expect(message.text).toBe('Notification contract check.');
  });
});
