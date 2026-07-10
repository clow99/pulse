'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Card, Title, Badge } from '@velocityuikit/velocityui';
import { PageTransition } from '@/components/motion';
import type { InsightSummary } from '@/types';

const severityVariant: Record<string, 'info' | 'warning' | 'danger'> = {
  info: 'info',
  warning: 'warning',
  critical: 'danger',
};

export default function InsightsPage() {
  const siteId = useSearchParams().get('siteId') || '';
  const [insights, setInsights] = useState<InsightSummary[]>([]);

  const loadInsights = useCallback(async () => {
    if (!siteId) return;
    const res = await fetch(`/api/insights?siteId=${siteId}`);
    if (res.ok) setInsights(await res.json());
  }, [siteId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInsights();
  }, [loadInsights]);

  async function updateInsight(id: string, action: 'complete' | 'snooze' | 'dismiss') {
    const res = await fetch(`/api/insights/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (res.ok) loadInsights();
  }

  return (
    <PageTransition>
      <div className="pulse-page">
        <div className="pulse-page-header">
          <div>
            <Title level="h1" size="lg">Insights</Title>
            <p style={{ color: 'var(--pulse-text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Actionable recommendations from analytics, revenue, uptime, funnel, and performance data.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {insights.length === 0 ? (
            <Card variant="shadow">
              <Card.Body>
                <p style={{ color: 'var(--pulse-text-secondary)', margin: 0 }}>
                  No active action items. Run the insights job after data has been collected, or come back after Pulse has more signal.
                </p>
              </Card.Body>
            </Card>
          ) : insights.map((insight) => (
            <Card key={insight.id} variant="shadow">
              <Card.Body>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div>
                    <Badge variant={severityVariant[insight.severity] ?? 'info'} size="sm">{insight.severity}</Badge>
                    <h2 style={{ fontSize: '1rem', margin: '0.625rem 0 0.375rem' }}>{insight.title}</h2>
                    <p style={{ color: 'var(--pulse-text-secondary)', margin: 0 }}>{insight.body}</p>
                    {insight.impact && (
                      <p style={{ color: 'var(--pulse-text-primary)', fontSize: '0.875rem', margin: '0.75rem 0 0' }}>
                        <strong>Impact:</strong> {insight.impact}
                      </p>
                    )}
                    {insight.recommendation && (
                      <p style={{ color: 'var(--pulse-text-secondary)', fontSize: '0.875rem', margin: '0.5rem 0 0' }}>
                        <strong style={{ color: 'var(--pulse-text-primary)' }}>Recommended action:</strong> {insight.recommendation}
                      </p>
                    )}
                    <p style={{ color: 'var(--pulse-text-secondary)', fontSize: '0.75rem', margin: '0.75rem 0 0' }}>
                      Created {new Date(insight.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Button variant="primary" size="sm" onClick={() => updateInsight(insight.id, 'complete')}>Done</Button>
                    <Button variant="secondary" size="sm" onClick={() => updateInsight(insight.id, 'snooze')}>Snooze</Button>
                    <Button variant="ghost" size="sm" onClick={() => updateInsight(insight.id, 'dismiss')}>Dismiss</Button>
                  </div>
                  </div>
                  {Object.keys(insight.evidence || {}).length > 0 && (
                    <details className="pulse-evidence-panel">
                      <summary>Evidence</summary>
                      <pre>{JSON.stringify(insight.evidence, null, 2)}</pre>
                    </details>
                  )}
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
