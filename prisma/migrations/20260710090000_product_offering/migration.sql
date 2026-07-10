ALTER TABLE "Insight"
ADD COLUMN "impact" TEXT,
ADD COLUMN "recommendation" TEXT,
ADD COLUMN "snoozedUntil" TIMESTAMP(3),
ADD COLUMN "completedAt" TIMESTAMP(3);

CREATE TABLE "ShareLink" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "reports" TEXT[],
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScheduledReport" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reports" TEXT[],
    "frequency" TEXT NOT NULL DEFAULT 'weekly',
    "channelType" "NotificationChannelType" NOT NULL,
    "target" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "nextRunAt" TIMESTAMP(3),
    "lastSentAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamInvite" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'viewer',
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamInvite_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Insight_siteId_completedAt_idx" ON "Insight"("siteId", "completedAt");
CREATE INDEX "Insight_siteId_snoozedUntil_idx" ON "Insight"("siteId", "snoozedUntil");

CREATE UNIQUE INDEX "ShareLink_token_key" ON "ShareLink"("token");
CREATE INDEX "ShareLink_orgId_idx" ON "ShareLink"("orgId");
CREATE INDEX "ShareLink_siteId_idx" ON "ShareLink"("siteId");
CREATE INDEX "ShareLink_revokedAt_idx" ON "ShareLink"("revokedAt");
CREATE INDEX "ShareLink_expiresAt_idx" ON "ShareLink"("expiresAt");

CREATE INDEX "ScheduledReport_orgId_idx" ON "ScheduledReport"("orgId");
CREATE INDEX "ScheduledReport_siteId_idx" ON "ScheduledReport"("siteId");
CREATE INDEX "ScheduledReport_enabled_nextRunAt_idx" ON "ScheduledReport"("enabled", "nextRunAt");

CREATE UNIQUE INDEX "TeamInvite_token_key" ON "TeamInvite"("token");
CREATE INDEX "TeamInvite_orgId_idx" ON "TeamInvite"("orgId");
CREATE INDEX "TeamInvite_email_idx" ON "TeamInvite"("email");
CREATE INDEX "TeamInvite_status_idx" ON "TeamInvite"("status");

ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScheduledReport" ADD CONSTRAINT "ScheduledReport_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduledReport" ADD CONSTRAINT "ScheduledReport_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduledReport" ADD CONSTRAINT "ScheduledReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TeamInvite" ADD CONSTRAINT "TeamInvite_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamInvite" ADD CONSTRAINT "TeamInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
