-- Agent access tokens are hashed and shown only once at creation/rotation.
CREATE TABLE "AgentToken" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "siteId" TEXT,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "scopes" TEXT[],
    "role" "OrgRole" NOT NULL DEFAULT 'viewer',
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentAuditLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "siteId" TEXT,
    "tokenId" TEXT,
    "action" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "toolName" TEXT,
    "scopes" TEXT[],
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentToken_tokenHash_key" ON "AgentToken"("tokenHash");
CREATE INDEX "AgentToken_orgId_idx" ON "AgentToken"("orgId");
CREATE INDEX "AgentToken_siteId_idx" ON "AgentToken"("siteId");
CREATE INDEX "AgentToken_tokenPrefix_idx" ON "AgentToken"("tokenPrefix");
CREATE INDEX "AgentToken_revokedAt_idx" ON "AgentToken"("revokedAt");
CREATE INDEX "AgentToken_expiresAt_idx" ON "AgentToken"("expiresAt");

CREATE INDEX "AgentAuditLog_orgId_createdAt_idx" ON "AgentAuditLog"("orgId", "createdAt");
CREATE INDEX "AgentAuditLog_siteId_createdAt_idx" ON "AgentAuditLog"("siteId", "createdAt");
CREATE INDEX "AgentAuditLog_tokenId_createdAt_idx" ON "AgentAuditLog"("tokenId", "createdAt");
CREATE INDEX "AgentAuditLog_action_createdAt_idx" ON "AgentAuditLog"("action", "createdAt");

ALTER TABLE "AgentToken" ADD CONSTRAINT "AgentToken_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentToken" ADD CONSTRAINT "AgentToken_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentToken" ADD CONSTRAINT "AgentToken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AgentAuditLog" ADD CONSTRAINT "AgentAuditLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentAuditLog" ADD CONSTRAINT "AgentAuditLog_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentAuditLog" ADD CONSTRAINT "AgentAuditLog_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "AgentToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;
