export type OrgRole = 'owner' | 'admin' | 'viewer';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  activeOrgId: string | null;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface ReportFilters {
  siteId: string;
  from: string;
  to: string;
  dimension?: string;
  dimensionValue?: string;
}

export interface StatsOverview {
  visitors: number;
  pageviews: number;
  bounceRate: number;
  avgPagesPerVisit: number;
  visitorsChange: number;
  pageviewsChange: number;
}

export interface TimeseriesPoint {
  date: string;
  visitors: number;
  pageviews: number;
}

export interface TopPage {
  pathname: string;
  views: number;
  visitors: number;
}

export interface TopReferrer {
  referrer: string;
  visitors: number;
  percentage: number;
}

export interface EventSummary {
  name: string;
  count: number;
  uniqueTriggers: number;
  properties: Record<string, Record<string, number>>;
}

export interface TechnologyBreakdown {
  name: string;
  visitors: number;
  percentage: number;
}

export interface AcquisitionData {
  referrers: TopReferrer[];
  utmSources: { source: string; visitors: number; percentage: number }[];
  utmMediums: { medium: string; visitors: number; percentage: number }[];
  utmCampaigns: { campaign: string; visitors: number; percentage: number }[];
}

export interface SiteWithStats {
  id: string;
  name: string;
  domain: string;
  token: string;
  active: boolean;
  createdAt: string;
  pageviewCount: number;
}
