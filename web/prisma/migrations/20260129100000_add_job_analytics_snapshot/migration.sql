-- CreateTable
CREATE TABLE "JobAnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "aggregatedAt" TIMESTAMP(3) NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "dailyStats" JSONB NOT NULL,
    "skillStats" JSONB NOT NULL,
    "positionStats" JSONB NOT NULL,
    "priceStats" JSONB,

    CONSTRAINT "JobAnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobAnalyticsSnapshot_period_key" ON "JobAnalyticsSnapshot"("period");

-- CreateIndex
CREATE INDEX "JobAnalyticsSnapshot_period_idx" ON "JobAnalyticsSnapshot"("period");
