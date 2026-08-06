-- CreateEnum
CREATE TYPE "PartnerUnitStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "partner_units" (
    "id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "postal_code_normalized" VARCHAR(8) NOT NULL,
    "street" VARCHAR(160) NOT NULL,
    "address_number" VARCHAR(30) NOT NULL,
    "address_complement" VARCHAR(120),
    "neighborhood" VARCHAR(120) NOT NULL,
    "city" VARCHAR(120) NOT NULL,
    "state" CHAR(2) NOT NULL,
    "formatted_address" VARCHAR(500),
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(10,6),
    "map_provider_id" VARCHAR(255),
    "last_geocoded_at" TIMESTAMPTZ(3),
    "phone_normalized" VARCHAR(13) NOT NULL,
    "whatsapp_normalized" VARCHAR(13),
    "status" "PartnerUnitStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "partner_units_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "partner_units_postal_code_check" CHECK ("postal_code_normalized" ~ '^[0-9]{8}$'),
    CONSTRAINT "partner_units_state_check" CHECK ("state" ~ '^[A-Z]{2}$'),
    CONSTRAINT "partner_units_location_pair_check" CHECK (("latitude" IS NULL) = ("longitude" IS NULL)),
    CONSTRAINT "partner_units_latitude_check" CHECK ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90),
    CONSTRAINT "partner_units_longitude_check" CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180)
);

CREATE TABLE "business_hours" (
    "unit_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "opens_at" CHAR(5),
    "closes_at" CHAR(5),
    "is_closed" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "business_hours_pkey" PRIMARY KEY ("unit_id", "day_of_week"),
    CONSTRAINT "business_hours_day_check" CHECK ("day_of_week" BETWEEN 0 AND 6),
    CONSTRAINT "business_hours_values_check" CHECK (
        ("is_closed" = true AND "opens_at" IS NULL AND "closes_at" IS NULL)
        OR
        ("is_closed" = false AND "opens_at" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "closes_at" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "opens_at" < "closes_at")
    )
);

CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "code" VARCHAR(60) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "status" "ServiceStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "unit_services" (
    "unit_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "unit_services_pkey" PRIMARY KEY ("unit_id", "service_id")
);

CREATE TABLE "unit_vehicle_types" (
    "unit_id" UUID NOT NULL,
    "vehicle_type" "VehicleType" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "unit_vehicle_types_pkey" PRIMARY KEY ("unit_id", "vehicle_type")
);

CREATE TABLE "unit_accepted_plans" (
    "unit_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "unit_accepted_plans_pkey" PRIMARY KEY ("unit_id", "plan_id")
);

CREATE UNIQUE INDEX "services_code_key" ON "services"("code");
CREATE INDEX "services_status_name_idx" ON "services"("status", "name");
CREATE INDEX "partner_units_partner_id_status_idx" ON "partner_units"("partner_id", "status");
CREATE INDEX "partner_units_status_city_state_idx" ON "partner_units"("status", "city", "state");
CREATE INDEX "unit_services_service_id_idx" ON "unit_services"("service_id");
CREATE INDEX "unit_accepted_plans_plan_id_idx" ON "unit_accepted_plans"("plan_id");

ALTER TABLE "partner_units" ADD CONSTRAINT "partner_units_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "business_hours" ADD CONSTRAINT "business_hours_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "partner_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "unit_services" ADD CONSTRAINT "unit_services_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "partner_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "unit_services" ADD CONSTRAINT "unit_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "unit_vehicle_types" ADD CONSTRAINT "unit_vehicle_types_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "partner_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "unit_accepted_plans" ADD CONSTRAINT "unit_accepted_plans_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "partner_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "unit_accepted_plans" ADD CONSTRAINT "unit_accepted_plans_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed the initial closed service catalog.
INSERT INTO "services" ("id", "code", "name", "description", "status", "created_at", "updated_at")
VALUES (
    '00000000-0000-4000-8000-000000000101',
    'CAR_WASH',
    'Lavagem automotiva',
    'Lavagem automotiva disponibilizada pelos planos VEKKO.',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO NOTHING;

-- Backfill one deterministic first unit per existing partner. Re-running the
-- migration SQL cannot duplicate the unit because it reuses the partner UUID.
INSERT INTO "partner_units" (
    "id",
    "partner_id",
    "name",
    "postal_code_normalized",
    "street",
    "address_number",
    "address_complement",
    "neighborhood",
    "city",
    "state",
    "formatted_address",
    "phone_normalized",
    "whatsapp_normalized",
    "status",
    "created_at",
    "updated_at"
)
SELECT
    partner."id",
    partner."id",
    'Unidade principal',
    partner."postal_code_normalized",
    partner."street",
    partner."address_number",
    partner."address_complement",
    partner."neighborhood",
    partner."city",
    partner."state",
    concat_ws(', ', partner."street", partner."address_number", partner."neighborhood", partner."city" || ' - ' || partner."state", partner."postal_code_normalized"),
    partner."contact_phone",
    partner."whatsapp_normalized",
    'DRAFT',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "partners" partner
ON CONFLICT ("id") DO NOTHING;
