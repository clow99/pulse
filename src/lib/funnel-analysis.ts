export interface GoalDefinition {
  id: string;
  name: string;
  type: 'pageview' | 'event';
  matchType: 'exact' | 'prefix';
  path: string | null;
  eventName: string | null;
  propertyKey: string | null;
  propertyValue: string | null;
}

export interface FunnelDefinition {
  id: string;
  name: string;
  mode: 'sequential' | 'strict';
  steps: { position: number; goal: GoalDefinition }[];
}

export interface Activity {
  visitId: string;
  type: 'pageview' | 'event';
  pathname: string;
  eventName?: string;
  properties?: Record<string, unknown> | null;
  timestamp: Date;
}

export function pathMatches(goal: GoalDefinition, pathname: string) {
  const target = goal.path || '';
  if (!target) return false;
  if (goal.matchType === 'prefix') {
    const prefix = target.endsWith('*') ? target.slice(0, -1) : target;
    return pathname.startsWith(prefix);
  }
  return pathname === target;
}

export function activityMatchesGoal(activity: Activity, goal: GoalDefinition) {
  if (goal.type === 'pageview') {
    return activity.type === 'pageview' && pathMatches(goal, activity.pathname);
  }

  if (activity.type !== 'event' || activity.eventName !== goal.eventName) {
    return false;
  }

  if (!goal.propertyKey) return true;
  const value = activity.properties?.[goal.propertyKey];
  return String(value ?? '') === String(goal.propertyValue ?? '');
}

export function analyzeFunnel(funnel: FunnelDefinition, activities: Activity[]) {
  const orderedSteps = [...funnel.steps].sort((a, b) => a.position - b.position);
  const stepCounts = orderedSteps.map(() => 0);
  const visitGroups = new Map<string, Activity[]>();

  for (const activity of activities) {
    const group = visitGroups.get(activity.visitId) ?? [];
    group.push(activity);
    visitGroups.set(activity.visitId, group);
  }

  for (const group of visitGroups.values()) {
    const ordered = group.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const reached = funnel.mode === 'strict'
      ? analyzeStrict(orderedSteps, ordered)
      : analyzeSequential(orderedSteps, ordered);

    for (let i = 0; i < reached; i++) {
      stepCounts[i]++;
    }
  }

  const entrants = stepCounts[0] ?? 0;
  const completions = stepCounts[stepCounts.length - 1] ?? 0;
  const conversionRate = entrants > 0 ? Math.round((completions / entrants) * 10000) / 100 : 0;

  return {
    entrants,
    completions,
    conversionRate,
    steps: orderedSteps.map((step, index) => {
      const count = stepCounts[index] ?? 0;
      const previousCount = index === 0 ? count : stepCounts[index - 1] ?? 0;
      const dropoffRate = index === 0 || previousCount === 0
        ? 0
        : Math.round(((previousCount - count) / previousCount) * 10000) / 100;
      return {
        goalId: step.goal.id,
        name: step.goal.name,
        position: step.position,
        count,
        dropoffRate,
      };
    }),
  };
}

function analyzeSequential(steps: FunnelDefinition['steps'], activities: Activity[]) {
  let cursor = 0;
  for (const activity of activities) {
    const step = steps[cursor];
    if (!step) break;
    if (activityMatchesGoal(activity, step.goal)) {
      cursor++;
    }
  }
  return cursor;
}

function analyzeStrict(steps: FunnelDefinition['steps'], activities: Activity[]) {
  let bestReached = 0;

  for (let start = 0; start < activities.length; start++) {
    let reached = 0;
    for (let offset = 0; offset < steps.length; offset++) {
      const activity = activities[start + offset];
      const step = steps[offset];
      if (!activity || !step || !activityMatchesGoal(activity, step.goal)) {
        break;
      }
      reached++;
    }
    bestReached = Math.max(bestReached, reached);
    if (bestReached === steps.length) break;
  }

  return bestReached;
}
