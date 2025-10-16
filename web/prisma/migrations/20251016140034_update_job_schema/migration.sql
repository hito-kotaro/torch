/*
  Warnings:

  - You are about to drop the column `emailId` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `originalSubject` on the `Job` table. All the data in the column will be lost.
  - Added the required column `originalTitle` to the `Job` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Job_emailId_key";

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "emailId",
DROP COLUMN "originalSubject",
ADD COLUMN     "originalTitle" TEXT NOT NULL,
ADD COLUMN     "unitPrice" INTEGER;

-- CreateIndex
CREATE INDEX "Job_unitPrice_idx" ON "Job"("unitPrice");
