-- Security and administrative event log.
--
-- No foreign keys on "companyId"/"actorId" by design: an audit record must
-- outlive the row it describes, so a user or tenant deletion must not cascade
-- the evidence of that deletion away. See the model comment in schema.prisma.

CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- Tenant timeline: the common read, and the one that has to stay fast as this
-- table grows without bound.
CREATE INDEX "SecurityEvent_companyId_createdAt_idx" ON "SecurityEvent"("companyId", "createdAt");

-- "What did this user do?"
CREATE INDEX "SecurityEvent_actorId_createdAt_idx" ON "SecurityEvent"("actorId", "createdAt");

-- "Show every failed login", and age-based retention purges.
CREATE INDEX "SecurityEvent_action_createdAt_idx" ON "SecurityEvent"("action", "createdAt");
CREATE INDEX "SecurityEvent_createdAt_idx" ON "SecurityEvent"("createdAt");
