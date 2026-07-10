'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Card, Input, Title, Badge } from '@velocityuikit/velocityui';
import { subDays, startOfDay, endOfDay, format, parseISO } from 'date-fns';
import { PageTransition } from '@/components/motion';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';

interface Goal {
  id: string;
  name: string;
  type: 'pageview' | 'event';
  path?: string | null;
  eventName?: string | null;
}

interface GoalReport extends Goal {
  count: number;
  uniqueVisits: number;
  legacyCount: number;
}

interface FunnelReport {
  id: string;
  name: string;
  mode: 'sequential' | 'strict';
  entrants: number;
  completions: number;
  conversionRate: number;
  steps: { goalId: string; name: string; position: number; count: number; dropoffRate: number }[];
}

interface GoalRecipe {
  id: string;
  name: string;
  type: 'pageview' | 'event';
  description: string;
}

export default function FunnelsPage() {
  const siteId = useSearchParams().get('siteId') || '';
  const [from, setFrom] = useState(() => format(startOfDay(subDays(new Date(), 30)), 'yyyy-MM-dd'));
  const [to, setTo] = useState(() => format(endOfDay(new Date()), 'yyyy-MM-dd'));
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalReports, setGoalReports] = useState<GoalReport[]>([]);
  const [funnelReports, setFunnelReports] = useState<FunnelReport[]>([]);
  const [goalName, setGoalName] = useState('');
  const [goalType, setGoalType] = useState<'pageview' | 'event'>('pageview');
  const [goalTarget, setGoalTarget] = useState('');
  const [funnelName, setFunnelName] = useState('');
  const [funnelMode, setFunnelMode] = useState<'sequential' | 'strict'>('sequential');
  const [stepA, setStepA] = useState('');
  const [stepB, setStepB] = useState('');
  const [stepC, setStepC] = useState('');
  const [recipes, setRecipes] = useState<GoalRecipe[]>([]);
  const [recipeStatus, setRecipeStatus] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    if (!siteId) return;
    const fromISO = startOfDay(parseISO(from)).toISOString();
    const toISO = endOfDay(parseISO(to)).toISOString();
    const params = new URLSearchParams({ siteId, from: fromISO, to: toISO });
    const [goalsRes, goalReportsRes, funnelReportsRes] = await Promise.all([
      fetch(`/api/goals?siteId=${siteId}`),
      fetch(`/api/reports/goals?${params}`),
      fetch(`/api/reports/funnels?${params}`),
    ]);
    if (goalsRes.ok) setGoals(await goalsRes.json());
    if (goalReportsRes.ok) setGoalReports(await goalReportsRes.json());
    if (funnelReportsRes.ok) setFunnelReports(await funnelReportsRes.json());
  }, [from, siteId, to]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  useEffect(() => {
    fetch('/api/goals/recipes')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => { if (Array.isArray(data)) setRecipes(data); })
      .catch(() => {});
  }, []);

  async function createGoal() {
    if (!siteId || !goalName || !goalTarget) return;
    const body = goalType === 'pageview'
      ? { siteId, name: goalName, type: goalType, matchType: goalTarget.endsWith('*') ? 'prefix' : 'exact', path: goalTarget }
      : { siteId, name: goalName, type: goalType, eventName: goalTarget };
    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setGoalName('');
      setGoalTarget('');
      loadData();
    }
  }

  async function createFunnel() {
    if (!siteId || !funnelName) return;
    const goalIds = [stepA, stepB, stepC].filter(Boolean);
    if (goalIds.length < 2) return;
    const res = await fetch('/api/funnels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId, name: funnelName, mode: funnelMode, goalIds }),
    });
    if (res.ok) {
      setFunnelName('');
      setStepA('');
      setStepB('');
      setStepC('');
      loadData();
    }
  }

  async function applyRecipe(recipeId: string) {
    if (!siteId) return;
    setRecipeStatus((current) => ({ ...current, [recipeId]: 'Adding...' }));
    const res = await fetch('/api/goals/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId, recipeIds: [recipeId] }),
    });
    if (res.ok) {
      const data = await res.json();
      const status = data.results?.[0]?.status === 'skipped' ? 'Already added' : 'Added';
      setRecipeStatus((current) => ({ ...current, [recipeId]: status }));
      loadData();
    } else {
      setRecipeStatus((current) => ({ ...current, [recipeId]: 'Failed' }));
    }
  }

  return (
    <PageTransition>
      <div className="pulse-page">
        <div className="pulse-page-header">
          <Title level="h1" size="lg">Funnels</Title>
          <DateRangePicker from={from} to={to} onChange={(nextFrom, nextTo) => { setFrom(nextFrom); setTo(nextTo); }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <Card variant="shadow">
            <Card.Header><Title level="h3" size="sm">Create Goal</Title></Card.Header>
            <Card.Body>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <Input placeholder="Goal name" value={goalName} onChange={(e) => setGoalName(e.target.value)} />
                <select className="pulse-select" value={goalType} onChange={(e) => setGoalType(e.target.value as 'pageview' | 'event')}>
                  <option value="pageview">Pageview</option>
                  <option value="event">Event</option>
                </select>
                <Input placeholder={goalType === 'pageview' ? '/pricing or /docs/*' : 'signup_complete'} value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} />
                <Button variant="primary" onClick={createGoal}>Add Goal</Button>
              </div>
            </Card.Body>
          </Card>

          <Card variant="shadow">
            <Card.Header><Title level="h3" size="sm">Create Funnel</Title></Card.Header>
            <Card.Body>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <Input placeholder="Funnel name" value={funnelName} onChange={(e) => setFunnelName(e.target.value)} />
                <select className="pulse-select" value={funnelMode} onChange={(e) => setFunnelMode(e.target.value as 'sequential' | 'strict')}>
                  <option value="sequential">Sequential</option>
                  <option value="strict">Strict</option>
                </select>
                {[stepA, stepB, stepC].map((value, index) => (
                  <select key={index} className="pulse-select" value={value} onChange={(e) => [setStepA, setStepB, setStepC][index](e.target.value)}>
                    <option value="">{index < 2 ? `Step ${index + 1}` : 'Optional step 3'}</option>
                    {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}
                  </select>
                ))}
                <Button variant="primary" onClick={createFunnel}>Add Funnel</Button>
              </div>
            </Card.Body>
          </Card>
        </div>

        <div className="pulse-section">
          <div className="pulse-section-header" style={{ marginBottom: '1rem' }}>
            <div>
              <Title level="h3" size="sm">Conversion Recipes</Title>
              <p className="pulse-page-subtitle">
                Add common goals in one click, then combine them into funnels.
              </p>
            </div>
          </div>
          <div className="pulse-recipe-grid">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="pulse-recipe-card">
                <div>
                  <strong>{recipe.name}</strong>
                  <p>{recipe.description}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Badge size="sm" variant="default">{recipe.type}</Badge>
                  <Button variant="secondary" size="sm" onClick={() => applyRecipe(recipe.id)}>
                    {recipeStatus[recipe.id] || 'Add'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pulse-section">
          <Title level="h3" size="sm">Goal Results</Title>
          {goalReports.length === 0 ? (
            <div className="pulse-empty-state" style={{ marginTop: '1rem' }}>
              No goal results for this date range.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
              {goalReports.map((goal) => (
                <Card key={goal.id} variant="bordered">
                  <Card.Body>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <strong>{goal.name}</strong>
                      <span>{goal.count.toLocaleString()} conversions</span>
                    </div>
                    <p style={{ color: 'var(--pulse-text-secondary)', fontSize: '0.8125rem', marginTop: '0.375rem' }}>
                      {goal.uniqueVisits.toLocaleString()} visits {goal.legacyCount > 0 ? `; ${goal.legacyCount} legacy rows excluded from visit-based math` : ''}
                    </p>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="pulse-section">
          <Title level="h3" size="sm">Funnel Results</Title>
          {funnelReports.length === 0 ? (
            <div className="pulse-empty-state" style={{ marginTop: '1rem' }}>
              Create a funnel with at least two goals to see conversion results.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
              {funnelReports.map((funnel) => (
                <Card key={funnel.id} variant="shadow">
                  <Card.Body>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                      <div><strong>{funnel.name}</strong> <Badge size="sm" variant="info">{funnel.mode}</Badge></div>
                      <span>{funnel.conversionRate.toFixed(2)}% conversion</span>
                    </div>
                    <div style={{ display: 'grid', gap: '0.5rem', overflowX: 'auto' }}>
                      {funnel.steps.map((step) => (
                        <div key={step.goalId} style={{ display: 'grid', gridTemplateColumns: '2rem minmax(12rem, 1fr) auto auto', gap: '0.75rem', alignItems: 'center', minWidth: '32rem' }}>
                          <span>{step.position}</span>
                          <span style={{ overflowWrap: 'anywhere' }}>{step.name}</span>
                          <span>{step.count.toLocaleString()}</span>
                          <span style={{ color: 'var(--pulse-text-secondary)' }}>{step.dropoffRate.toFixed(1)}% drop</span>
                        </div>
                      ))}
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
