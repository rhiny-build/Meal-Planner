-- CreateTable
CREATE TABLE "NormalisationCache" (
    "id" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "canonical" TEXT NOT NULL,
    "base" TEXT NOT NULL,
    "form" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NormalisationCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NormalisationCache_input_key" ON "NormalisationCache"("input");
