-- CreateTable
CREATE TABLE "RequestTiming" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "totalMs" INTEGER NOT NULL,
    "dbMs" INTEGER,
    "queryCount" INTEGER,
    "coldStart" BOOLEAN NOT NULL DEFAULT false,
    "ttfbMs" INTEGER,

    CONSTRAINT "RequestTiming_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RequestTiming_createdAt_idx" ON "RequestTiming"("createdAt");

-- CreateIndex
CREATE INDEX "RequestTiming_source_route_createdAt_idx" ON "RequestTiming"("source", "route", "createdAt");
