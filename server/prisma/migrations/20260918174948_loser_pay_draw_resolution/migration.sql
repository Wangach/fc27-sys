-- CreateEnum
CREATE TYPE "DrawResolution" AS ENUM ('HALF_HALF', 'SUPER_LOSER');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "drawResolution" "DrawResolution",
ADD COLUMN     "superLoserPlayerOneScore" INTEGER,
ADD COLUMN     "superLoserPlayerTwoScore" INTEGER;
