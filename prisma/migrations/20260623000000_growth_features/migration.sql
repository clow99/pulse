-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('pageview', 'event');

-- CreateEnum
CREATE TYPE "GoalMatchType" AS ENUM ('exact', 'prefix');

-- CreateEnum
CREATE TYPE "FunnelMode" AS ENUM ('sequential', 'strict');

-- CreateEnum
CREATE TYPE "NotificationChannelType" AS ENUM ('email', 'webhook');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('open', 'resolved');

-- CreateEnum
CREATE TYPE "InsightSeverity" AS ENUM ('info', 'warning', 'critical');

-- AlterTable
ALTER TABLE "Site" ADD COLUMN "collectWebVitals" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Pageview" ADD COLUMN "visitId" TEXT;
ALTER TABLE "Pageview" ADD COLUMN "hostname" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "visitId" TEXT;
ALTER TABLE "Event" ADD COLUMN "hostname" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Event" ADD COLUMN "utmSource" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Event" ADD COLUMN "utmMedium" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Event" ADD COLUMN "utmCampaign" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Event" ADD COLUMN "revenueValue" DECIMAL(12,2);
ALTER TABLE "Event" ADD COLUMN "revenueCurrency" TEXT;
ALTER TABLE "Event" ADD COLUMN "orderId" TEXT;

-- CreateTable
CREATE TABLE "NotificationChannel" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "type" "NotificationChannelType" NOT NULL,
    "name" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "notificationChannelId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 2,
    "recoveryChecks" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'open',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "lastNotifiedAt" TIMESTAMP(3),

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusPage" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatusPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusPageComponent" (
    "id" TEXT NOT NULL,
    "statusPageId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StatusPageComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "GoalType" NOT NULL,
    "matchType" "GoalMatchType" NOT NULL DEFAULT 'exact',
    "path" TEXT,
    "eventName" TEXT,
    "propertyKey" TEXT,
    "propertyValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Funnel" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "FunnelMode" NOT NULL DEFAULT 'sequential',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Funnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelStep" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "FunnelStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebVital" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "visitId" TEXT,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "rating" TEXT NOT NULL,
    "hostname" TEXT NOT NULL DEFAULT '',
    "pathname" TEXT NOT NULL DEFAULT '',
    "browser" TEXT NOT NULL DEFAULT '',
    "os" TEXT NOT NULL DEFAULT '',
    "device" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "language" TEXT NOT NULL DEFAULT '',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebVital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" "InsightSeverity" NOT NULL DEFAULT 'info',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Insight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pageview_siteId_visitId_timestamp_idx" ON "Pageview"("siteId", "visitId", "timestamp");

-- CreateIndex
CREATE INDEX "Event_siteId_visitId_timestamp_idx" ON "Event"("siteId", "visitId", "timestamp");

-- CreateIndex
CREATE INDEX "Event_siteId_orderId_idx" ON "Event"("siteId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_siteId_name_orderId_key" ON "Event"("siteId", "name", "orderId");

-- CreateIndex
CREATE INDEX "NotificationChannel_orgId_idx" ON "NotificationChannel"("orgId");

-- CreateIndex
CREATE INDEX "AlertRule_siteId_idx" ON "AlertRule"("siteId");

-- CreateIndex
CREATE INDEX "AlertRule_notificationChannelId_idx" ON "AlertRule"("notificationChannelId");

-- CreateIndex
CREATE INDEX "Incident_siteId_status_idx" ON "Incident"("siteId", "status");

-- CreateIndex
CREATE INDEX "Incident_siteId_startedAt_idx" ON "Incident"("siteId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StatusPage_slug_key" ON "StatusPage"("slug");

-- CreateIndex
CREATE INDEX "StatusPage_orgId_idx" ON "StatusPage"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "StatusPageComponent_statusPageId_siteId_key" ON "StatusPageComponent"("statusPageId", "siteId");

-- CreateIndex
CREATE INDEX "StatusPageComponent_siteId_idx" ON "StatusPageComponent"("siteId");

-- CreateIndex
CREATE INDEX "Goal_siteId_idx" ON "Goal"("siteId");

-- CreateIndex
CREATE INDEX "Funnel_siteId_idx" ON "Funnel"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "FunnelStep_funnelId_position_key" ON "FunnelStep"("funnelId", "position");

-- CreateIndex
CREATE INDEX "FunnelStep_goalId_idx" ON "FunnelStep"("goalId");

-- CreateIndex
CREATE INDEX "WebVital_siteId_timestamp_idx" ON "WebVital"("siteId", "timestamp");

-- CreateIndex
CREATE INDEX "WebVital_siteId_name_timestamp_idx" ON "WebVital"("siteId", "name", "timestamp");

-- CreateIndex
CREATE INDEX "Insight_siteId_createdAt_idx" ON "Insight"("siteId", "createdAt");

-- CreateIndex
CREATE INDEX "Insight_siteId_dismissedAt_idx" ON "Insight"("siteId", "dismissedAt");

-- AddForeignKey
ALTER TABLE "NotificationChannel" ADD CONSTRAINT "NotificationChannel_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_notificationChannelId_fkey" FOREIGN KEY ("notificationChannelId") REFERENCES "NotificationChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusPage" ADD CONSTRAINT "StatusPage_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusPageComponent" ADD CONSTRAINT "StatusPageComponent_statusPageId_fkey" FOREIGN KEY ("statusPageId") REFERENCES "StatusPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusPageComponent" ADD CONSTRAINT "StatusPageComponent_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funnel" ADD CONSTRAINT "Funnel_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelStep" ADD CONSTRAINT "FunnelStep_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "Funnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelStep" ADD CONSTRAINT "FunnelStep_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebVital" ADD CONSTRAINT "WebVital_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insight" ADD CONSTRAINT "Insight_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
