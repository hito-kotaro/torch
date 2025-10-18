-- CreateTable
CREATE TABLE "Talent" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "age" INTEGER,
    "position" TEXT,
    "workStyle" TEXT,
    "location" TEXT,
    "unitPrice" INTEGER,
    "summary" TEXT,
    "description" TEXT,
    "originalTitle" TEXT NOT NULL,
    "originalBody" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Talent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalentSkill" (
    "id" TEXT NOT NULL,
    "talentId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "TalentSkill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Talent_receivedAt_idx" ON "Talent"("receivedAt");

-- CreateIndex
CREATE INDEX "Talent_position_idx" ON "Talent"("position");

-- CreateIndex
CREATE INDEX "Talent_age_idx" ON "Talent"("age");

-- CreateIndex
CREATE INDEX "Talent_unitPrice_idx" ON "Talent"("unitPrice");

-- CreateIndex
CREATE INDEX "TalentSkill_talentId_idx" ON "TalentSkill"("talentId");

-- CreateIndex
CREATE INDEX "TalentSkill_skillId_idx" ON "TalentSkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "TalentSkill_talentId_skillId_key" ON "TalentSkill"("talentId", "skillId");

-- AddForeignKey
ALTER TABLE "TalentSkill" ADD CONSTRAINT "TalentSkill_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "Talent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentSkill" ADD CONSTRAINT "TalentSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "Job_position_idx" RENAME TO "Job_grade_idx";
