import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifySiteAccess } from '@/lib/site-access';
import { z } from 'zod';

const RECIPES = [
  { id: 'pricing_view', name: 'Viewed pricing', type: 'pageview', matchType: 'exact', path: '/pricing', description: 'Track visits to the pricing page.' },
  { id: 'docs_view', name: 'Viewed docs', type: 'pageview', matchType: 'prefix', path: '/docs', description: 'Track documentation engagement.' },
  { id: 'signup_complete', name: 'Signup completed', type: 'event', eventName: 'signup_complete', description: 'Track account creation or trial signup.' },
  { id: 'demo_request', name: 'Demo requested', type: 'event', eventName: 'demo_request', description: 'Track demo or sales contact requests.' },
  { id: 'checkout_started', name: 'Checkout started', type: 'event', eventName: 'checkout_started', description: 'Track users beginning checkout.' },
  { id: 'purchase', name: 'Purchase completed', type: 'event', eventName: 'purchase', description: 'Track completed revenue events.' },
  { id: 'newsletter_signup', name: 'Newsletter signup', type: 'event', eventName: 'newsletter_signup', description: 'Track email subscription intent.' },
  { id: 'outbound_click', name: 'Outbound click', type: 'event', eventName: 'outbound_click', description: 'Track clicks that leave the site.' },
  { id: 'scroll_depth', name: 'Reached 75% scroll', type: 'event', eventName: 'scroll_depth', propertyKey: 'percent', propertyValue: '75', description: 'Track high-intent page engagement.' },
] as const;

const createRecipesSchema = z.object({
  siteId: z.string().uuid(),
  recipeIds: z.array(z.string()).min(1).optional(),
});

export async function GET() {
  return NextResponse.json(RECIPES);
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = createRecipesSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid request' }, { status: 400 });
    }

    const access = await verifySiteAccess(session.user.id, parsed.data.siteId, ['owner', 'admin']);
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const selected = RECIPES.filter((recipe) =>
      parsed.data.recipeIds ? parsed.data.recipeIds.includes(recipe.id) : true
    );
    if (selected.length === 0) {
      return NextResponse.json({ error: 'No matching recipes' }, { status: 400 });
    }

    const results = [];
    for (const recipe of selected) {
      const existing = await prisma.goal.findFirst({
        where: {
          siteId: parsed.data.siteId,
          name: recipe.name,
        },
        select: { id: true },
      });
      if (existing) {
        results.push({ recipeId: recipe.id, status: 'skipped', goalId: existing.id });
        continue;
      }

      const goal = await prisma.goal.create({
        data: {
          siteId: parsed.data.siteId,
          name: recipe.name,
          type: recipe.type,
          matchType: 'matchType' in recipe ? recipe.matchType : 'exact',
          path: 'path' in recipe ? recipe.path : null,
          eventName: 'eventName' in recipe ? recipe.eventName : null,
          propertyKey: 'propertyKey' in recipe ? recipe.propertyKey : null,
          propertyValue: 'propertyValue' in recipe ? recipe.propertyValue : null,
        },
      });
      results.push({ recipeId: recipe.id, status: 'created', goalId: goal.id });
    }

    return NextResponse.json({ results }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
