-- CreateEnum
CREATE TYPE "AreaRole" AS ENUM ('MEMBER', 'AREA_ADMIN');

-- CreateTable areas
CREATE TABLE "areas" (
    "id"         TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "name"       TEXT NOT NULL,
    "patterns"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "areas"
    ADD CONSTRAINT "areas_instanceId_fkey"
    FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "areas_instanceId_name_key" ON "areas"("instanceId", "name");

-- CreateTable user_areas
CREATE TABLE "user_areas" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "areaId"    TEXT NOT NULL,
    "role"      "AreaRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_areas_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "user_areas"
    ADD CONSTRAINT "user_areas_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_areas"
    ADD CONSTRAINT "user_areas_areaId_fkey"
    FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "user_areas_userId_areaId_key" ON "user_areas"("userId", "areaId");

-- CreateTable user_area_visibilities
CREATE TABLE "user_area_visibilities" (
    "id"            TEXT NOT NULL,
    "userId"        TEXT NOT NULL,
    "visibleAreaId" TEXT NOT NULL,
    "grantedById"   TEXT NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_area_visibilities_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "user_area_visibilities"
    ADD CONSTRAINT "uav_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_area_visibilities"
    ADD CONSTRAINT "uav_visibleAreaId_fkey"
    FOREIGN KEY ("visibleAreaId") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_area_visibilities"
    ADD CONSTRAINT "uav_grantedById_fkey"
    FOREIGN KEY ("grantedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "uav_userId_visibleAreaId_key" ON "user_area_visibilities"("userId", "visibleAreaId");

-- AlterTable conversations — add areaId
ALTER TABLE "conversations" ADD COLUMN "areaId" TEXT;

ALTER TABLE "conversations"
    ADD CONSTRAINT "conversations_areaId_fkey"
    FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "conversations_areaId_idx" ON "conversations"("areaId");
