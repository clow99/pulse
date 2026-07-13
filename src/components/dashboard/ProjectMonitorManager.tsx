'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ServiceOption { id: string; name: string; environment: string }

export function ProjectMonitorManager({ services }: { services: ServiceOption[] }) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '');
  const [name, setName] = useState('');
  const [type, setType] = useState<'http' | 'heartbeat' | 'ssl_expiry' | 'domain_expiry'>('http');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function createMonitor(event: React.FormEvent) {
    event.preventDefault();
    if (!serviceId || !name) return;
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/services/${serviceId}/monitors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceId, name, type, ...(type === 'heartbeat' ? {} : { url }) }),
    });
    const body = await response.json();
    if (!response.ok) setMessage(body.error || 'Could not create monitor');
    else {
      setMessage(body.heartbeatSecret ? `Heartbeat URL: ${window.location.origin}/api/heartbeats/${body.heartbeatSecret}` : 'Monitor created');
      setName('');
      setUrl('');
      router.refresh();
    }
    setBusy(false);
  }

  if (!services.length) return null;
  return (
    <form onSubmit={createMonitor} className="pulse-panel" style={{ padding: 20, display: 'grid', gap: 12 }}>
      <h3 style={{ margin: 0 }}>Add monitor</h3>
      <select value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
        {services.map((service) => <option key={service.id} value={service.id}>{service.environment} / {service.name}</option>)}
      </select>
      <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Monitor name" maxLength={120} required />
      <select value={type} onChange={(event) => setType(event.target.value as typeof type)}>
        <option value="http">HTTP</option><option value="heartbeat">Heartbeat</option><option value="ssl_expiry">SSL expiry</option><option value="domain_expiry">Domain expiry</option>
      </select>
      {type !== 'heartbeat' && <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" type="url" required />}
      <button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create monitor'}</button>
      {message && <div style={{ fontSize: 13, overflowWrap: 'anywhere', color: 'var(--pulse-text-secondary)' }}>{message}</div>}
    </form>
  );
}
