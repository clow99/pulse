CREATE TYPE "EnvironmentKind" AS ENUM ('production', 'staging', 'development', 'other');
CREATE TYPE "ServiceKind" AS ENUM ('web', 'api', 'worker', 'database', 'job', 'other');
CREATE TYPE "MonitorType" AS ENUM ('http', 'heartbeat', 'ssl_expiry', 'domain_expiry');
CREATE TYPE "DeploymentStatus" AS ENUM ('started', 'succeeded', 'failed', 'rolled_back');
CREATE TYPE "BriefGenerator" AS ENUM ('template', 'ai');

ALTER TABLE "Organization"
ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC',
ADD COLUMN "dailyBriefEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "dailyBriefHour" INTEGER NOT NULL DEFAULT 8;

CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Environment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "EnvironmentKind" NOT NULL DEFAULT 'production',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Environment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "ServiceKind" NOT NULL DEFAULT 'web',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Monitor" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MonitorType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "intervalSeconds" INTEGER NOT NULL DEFAULT 300,
    "graceSeconds" INTEGER NOT NULL DEFAULT 60,
    "timeoutMs" INTEGER NOT NULL DEFAULT 10000,
    "config" JSONB NOT NULL DEFAULT '{}',
    "secretHash" TEXT,
    "secretPrefix" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Monitor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "serviceId" TEXT,
    "commitSha" TEXT,
    "version" TEXT,
    "status" "DeploymentStatus" NOT NULL DEFAULT 'succeeded',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "url" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "deployedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailyBrief" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "localDate" DATE NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "generator" "BriefGenerator" NOT NULL DEFAULT 'template',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyBrief_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Site" ADD COLUMN "serviceId" TEXT;
ALTER TABLE "UptimeCheck"
ADD COLUMN "monitorId" TEXT,
ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}',
ALTER COLUMN "siteId" DROP NOT NULL,
ALTER COLUMN "statusCode" DROP NOT NULL,
ALTER COLUMN "responseTime" DROP NOT NULL;
ALTER TABLE "AlertRule" ADD COLUMN "monitorId" TEXT, ALTER COLUMN "siteId" DROP NOT NULL;
ALTER TABLE "Incident" ADD COLUMN "monitorId" TEXT, ALTER COLUMN "siteId" DROP NOT NULL;
ALTER TABLE "StatusPageComponent" ADD COLUMN "serviceId" TEXT, ALTER COLUMN "siteId" DROP NOT NULL;
ALTER TABLE "AgentToken" ADD COLUMN "projectId" TEXT;
ALTER TABLE "AgentAuditLog" ADD COLUMN "projectId" TEXT;

INSERT INTO "Project" ("id", "orgId", "name", "slug", "description", "active", "createdAt", "updatedAt")
SELECT
    s."id",
    s."orgId",
    s."name",
    COALESCE(NULLIF(TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(s."name"), '[^a-z0-9]+', '-', 'g')), ''), 'project') || '-' || LEFT(REPLACE(s."id", '-', ''), 8),
    'Migrated from analytics site ' || s."domain",
    s."active",
    s."createdAt",
    CURRENT_TIMESTAMP
FROM "Site" s;

INSERT INTO "Environment" ("id", "projectId", "name", "slug", "kind", "createdAt", "updatedAt")
SELECT MD5('environment:' || s."id")::uuid::text, s."id", 'Production', 'production', 'production', s."createdAt", CURRENT_TIMESTAMP
FROM "Site" s;

INSERT INTO "Service" ("id", "environmentId", "name", "slug", "kind", "createdAt", "updatedAt")
SELECT MD5('service:' || s."id")::uuid::text, MD5('environment:' || s."id")::uuid::text, 'Web', 'web', 'web', s."createdAt", CURRENT_TIMESTAMP
FROM "Site" s;

UPDATE "Site"
SET "serviceId" = MD5('service:' || "id")::uuid::text;

INSERT INTO "Monitor" (
    "id", "serviceId", "name", "type", "enabled", "intervalSeconds", "graceSeconds", "timeoutMs", "config", "nextRunAt", "createdAt", "updatedAt"
)
SELECT
    MD5('monitor:' || s."id")::uuid::text,
    MD5('service:' || s."id")::uuid::text,
    s."name" || ' HTTP',
    'http',
    s."active",
    300,
    60,
    10000,
    JSONB_BUILD_OBJECT(
        'url', CASE WHEN s."domain" ~* '^https?://' THEN s."domain" ELSE 'https://' || s."domain" END,
        'method', 'HEAD',
        'expectedStatusMin', 200,
        'expectedStatusMax', 399
    ),
    CURRENT_TIMESTAMP,
    s."createdAt",
    CURRENT_TIMESTAMP
FROM "Site" s;

UPDATE "UptimeCheck" SET "monitorId" = MD5('monitor:' || "siteId")::uuid::text WHERE "siteId" IS NOT NULL;
UPDATE "AlertRule" SET "monitorId" = MD5('monitor:' || "siteId")::uuid::text WHERE "siteId" IS NOT NULL;
UPDATE "Incident" SET "monitorId" = MD5('monitor:' || "siteId")::uuid::text WHERE "siteId" IS NOT NULL;
UPDATE "StatusPageComponent" SET "serviceId" = MD5('service:' || "siteId")::uuid::text WHERE "siteId" IS NOT NULL;

UPDATE "AgentToken" token
SET "projectId" = site."id"
FROM "Site" site
WHERE token."siteId" = site."id";

UPDATE "AgentAuditLog" audit
SET "projectId" = site."id"
FROM "Site" site
WHERE audit."siteId" = site."id";

CREATE UNIQUE INDEX "Project_orgId_slug_key" ON "Project"("orgId", "slug");
CREATE INDEX "Project_orgId_active_idx" ON "Project"("orgId", "active");
CREATE UNIQUE INDEX "Environment_projectId_slug_key" ON "Environment"("projectId", "slug");
CREATE INDEX "Environment_projectId_kind_idx" ON "Environment"("projectId", "kind");
CREATE UNIQUE INDEX "Service_environmentId_slug_key" ON "Service"("environmentId", "slug");
CREATE INDEX "Service_environmentId_kind_idx" ON "Service"("environmentId", "kind");
CREATE UNIQUE INDEX "Monitor_secretHash_key" ON "Monitor"("secretHash");
CREATE INDEX "Monitor_serviceId_enabled_idx" ON "Monitor"("serviceId", "enabled");
CREATE INDEX "Monitor_enabled_nextRunAt_idx" ON "Monitor"("enabled", "nextRunAt");
CREATE INDEX "Monitor_type_lastSeenAt_idx" ON "Monitor"("type", "lastSeenAt");
CREATE INDEX "Deployment_projectId_deployedAt_idx" ON "Deployment"("projectId", "deployedAt");
CREATE INDEX "Deployment_environmentId_deployedAt_idx" ON "Deployment"("environmentId", "deployedAt");
CREATE INDEX "Deployment_serviceId_deployedAt_idx" ON "Deployment"("serviceId", "deployedAt");
CREATE UNIQUE INDEX "DailyBrief_orgId_localDate_key" ON "DailyBrief"("orgId", "localDate");
CREATE INDEX "DailyBrief_orgId_periodEnd_idx" ON "DailyBrief"("orgId", "periodEnd");
CREATE INDEX "Site_serviceId_idx" ON "Site"("serviceId");
CREATE INDEX "UptimeCheck_monitorId_checkedAt_idx" ON "UptimeCheck"("monitorId", "checkedAt");
CREATE INDEX "AlertRule_monitorId_idx" ON "AlertRule"("monitorId");
CREATE INDEX "Incident_monitorId_status_idx" ON "Incident"("monitorId", "status");
CREATE INDEX "Incident_monitorId_startedAt_idx" ON "Incident"("monitorId", "startedAt");
CREATE UNIQUE INDEX "StatusPageComponent_statusPageId_serviceId_key" ON "StatusPageComponent"("statusPageId", "serviceId");
CREATE INDEX "StatusPageComponent_serviceId_idx" ON "StatusPageComponent"("serviceId");
CREATE INDEX "AgentToken_projectId_idx" ON "AgentToken"("projectId");
CREATE INDEX "AgentAuditLog_projectId_createdAt_idx" ON "AgentAuditLog"("projectId", "createdAt");

ALTER TABLE "Project" ADD CONSTRAINT "Project_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Environment" ADD CONSTRAINT "Environment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Service" ADD CONSTRAINT "Service_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Monitor" ADD CONSTRAINT "Monitor_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DailyBrief" ADD CONSTRAINT "DailyBrief_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Site" ADD CONSTRAINT "Site_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UptimeCheck" ADD CONSTRAINT "UptimeCheck_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StatusPageComponent" ADD CONSTRAINT "StatusPageComponent_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentToken" ADD CONSTRAINT "AgentToken_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentAuditLog" ADD CONSTRAINT "AgentAuditLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
