import { describe, expect, it } from 'vitest';
import { analyzeFunnel, activityMatchesGoal, type Activity, type FunnelDefinition, type GoalDefinition } from './funnel-analysis';

const pageGoal: GoalDefinition = {
  id: 'pricing',
  name: 'Pricing',
  type: 'pageview',
  matchType: 'exact',
  path: '/pricing',
  eventName: null,
  propertyKey: null,
  propertyValue: null,
};

const eventGoal: GoalDefinition = {
  id: 'signup',
  name: 'Signup',
  type: 'event',
  matchType: 'exact',
  path: null,
  eventName: 'signup_complete',
  propertyKey: null,
  propertyValue: null,
};

const funnel: FunnelDefinition = {
  id: 'funnel',
  name: 'Signup funnel',
  mode: 'sequential',
  steps: [
    { position: 1, goal: pageGoal },
    { position: 2, goal: eventGoal },
  ],
};

function activity(partial: Partial<Activity>): Activity {
  return {
    visitId: 'visit-1',
    type: 'pageview',
    pathname: '/',
    timestamp: new Date(),
    ...partial,
  };
}

describe('activityMatchesGoal', () => {
  it('matches exact page goals', () => {
    expect(activityMatchesGoal(activity({ pathname: '/pricing' }), pageGoal)).toBe(true);
    expect(activityMatchesGoal(activity({ pathname: '/docs' }), pageGoal)).toBe(false);
  });

  it('matches event goals with properties', () => {
    const goal = { ...eventGoal, propertyKey: 'plan', propertyValue: 'pro' };
    expect(activityMatchesGoal(activity({
      type: 'event',
      eventName: 'signup_complete',
      properties: { plan: 'pro' },
    }), goal)).toBe(true);
    expect(activityMatchesGoal(activity({
      type: 'event',
      eventName: 'signup_complete',
      properties: { plan: 'starter' },
    }), goal)).toBe(false);
  });
});

describe('analyzeFunnel', () => {
  it('allows unrelated activity in sequential mode', () => {
    const result = analyzeFunnel(funnel, [
      activity({ visitId: 'a', pathname: '/pricing', timestamp: new Date('2026-01-01T00:00:00Z') }),
      activity({ visitId: 'a', pathname: '/docs', timestamp: new Date('2026-01-01T00:01:00Z') }),
      activity({ visitId: 'a', type: 'event', eventName: 'signup_complete', timestamp: new Date('2026-01-01T00:02:00Z') }),
    ]);
    expect(result.entrants).toBe(1);
    expect(result.completions).toBe(1);
    expect(result.conversionRate).toBe(100);
  });

  it('requires consecutive matched activities in strict mode', () => {
    const result = analyzeFunnel({ ...funnel, mode: 'strict' }, [
      activity({ visitId: 'a', pathname: '/pricing', timestamp: new Date('2026-01-01T00:00:00Z') }),
      activity({ visitId: 'a', pathname: '/docs', timestamp: new Date('2026-01-01T00:01:00Z') }),
      activity({ visitId: 'a', type: 'event', eventName: 'signup_complete', timestamp: new Date('2026-01-01T00:02:00Z') }),
    ]);
    expect(result.entrants).toBe(1);
    expect(result.completions).toBe(0);
  });
});
