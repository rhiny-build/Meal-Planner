-- CreateTable
CREATE TABLE "AgentClassificationLog" (
    "id" TEXT NOT NULL,
    "rawName" TEXT NOT NULL,
    "suggestedItemId" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentClassificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentClassificationLog_rawName_idx" ON "AgentClassificationLog"("rawName");

-- CreateIndex
CREATE INDEX "AgentClassificationLog_status_idx" ON "AgentClassificationLog"("status");

-- CreateIndex
CREATE INDEX "AgentClassificationLog_runId_idx" ON "AgentClassificationLog"("runId");

-- AddForeignKey
ALTER TABLE "AgentClassificationLog" ADD CONSTRAINT "AgentClassificationLog_suggestedItemId_fkey"
    FOREIGN KEY ("suggestedItemId") REFERENCES "MasterListItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
