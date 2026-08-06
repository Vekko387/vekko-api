-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('HATCH', 'SEDAN', 'SUV', 'PICKUP');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "user_profiles"
ADD COLUMN "full_name" VARCHAR(160),
ADD COLUMN "phone_normalized" VARCHAR(11),
ADD COLUMN "profile_completed_at" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plate_normalized" VARCHAR(7) NOT NULL,
    "type" "VehicleType" NOT NULL,
    "brand" VARCHAR(80) NOT NULL,
    "model" VARCHAR(80) NOT NULL,
    "color" VARCHAR(50) NOT NULL,
    "year" INTEGER,
    "nickname" VARCHAR(60),
    "status" "VehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "vehicles_plate_format_check" CHECK (
        "plate_normalized" ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$'
    ),
    CONSTRAINT "vehicles_year_check" CHECK (
        "year" IS NULL OR "year" BETWEEN 1900 AND 2100
    ),
    CONSTRAINT "vehicles_inactive_not_primary_check" CHECK (
        "status" = 'ACTIVE' OR "is_primary" = false
    )
);

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plate_normalized_key" ON "vehicles"("plate_normalized");

-- CreateIndex
CREATE INDEX "vehicles_status_idx" ON "vehicles"("status");

-- CreateIndex
CREATE INDEX "vehicles_type_idx" ON "vehicles"("type");

-- CreateIndex
CREATE INDEX "vehicles_user_id_status_idx" ON "vehicles"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_one_active_primary_per_user_idx"
ON "vehicles"("user_id")
WHERE "is_primary" = true AND "status" = 'ACTIVE';

-- AddForeignKey
ALTER TABLE "vehicles"
ADD CONSTRAINT "vehicles_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
