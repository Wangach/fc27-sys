-- CreateTable
CREATE TABLE "football_teams" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "football_teams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "football_teams_name_idx" ON "football_teams"("name");

-- CreateIndex
CREATE UNIQUE INDEX "football_teams_name_country_key" ON "football_teams"("name", "country");
