-- CreateTable
CREATE TABLE "PlanDraft" (
    "id" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "days" JSONB NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanDraft_weekStart_key" ON "PlanDraft"("weekStart");

