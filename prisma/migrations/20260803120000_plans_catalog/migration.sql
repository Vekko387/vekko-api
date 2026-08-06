-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('BASIC', 'ESSENTIAL', 'PREMIUM', 'UNLIMITED');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PlanBenefitMode" AS ENUM ('LIMITED', 'UNLIMITED');

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "code" "PlanCode" NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "monthly_price_cents" INTEGER NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "plans_monthly_price_check" CHECK ("monthly_price_cents" > 0),
    CONSTRAINT "plans_display_order_check" CHECK ("display_order" BETWEEN 1 AND 4)
);

-- CreateTable
CREATE TABLE "plan_benefits" (
    "plan_id" UUID NOT NULL,
    "mode" "PlanBenefitMode" NOT NULL,
    "washes_per_cycle" INTEGER,
    "max_uses_per_day" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "plan_benefits_pkey" PRIMARY KEY ("plan_id"),
    CONSTRAINT "plan_benefits_mode_values_check" CHECK (
        (
            "mode" = 'LIMITED'
            AND "washes_per_cycle" IS NOT NULL
            AND "washes_per_cycle" > 0
            AND "max_uses_per_day" IS NULL
        )
        OR
        (
            "mode" = 'UNLIMITED'
            AND "washes_per_cycle" IS NULL
            AND "max_uses_per_day" IS NOT NULL
            AND "max_uses_per_day" > 0
        )
    )
);

-- CreateTable
CREATE TABLE "plan_vehicle_eligibilities" (
    "plan_id" UUID NOT NULL,
    "vehicle_type" "VehicleType" NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "plan_vehicle_eligibilities_pkey" PRIMARY KEY ("plan_id", "vehicle_type")
);

-- CreateIndex
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");

-- CreateIndex
CREATE INDEX "plans_status_display_order_idx" ON "plans"("status", "display_order");

-- CreateIndex
CREATE INDEX "plan_vehicle_eligibilities_type_allowed_idx"
ON "plan_vehicle_eligibilities"("vehicle_type", "allowed");

-- AddForeignKey
ALTER TABLE "plan_benefits"
ADD CONSTRAINT "plan_benefits_plan_id_fkey"
FOREIGN KEY ("plan_id") REFERENCES "plans"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_vehicle_eligibilities"
ADD CONSTRAINT "plan_vehicle_eligibilities_plan_id_fkey"
FOREIGN KEY ("plan_id") REFERENCES "plans"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Protect immutable plan codes even from direct database writes.
CREATE FUNCTION "prevent_plan_code_change"()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."code" IS DISTINCT FROM OLD."code" THEN
        RAISE EXCEPTION 'Plan code is immutable' USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "plans_code_immutable_trigger"
BEFORE UPDATE OF "code" ON "plans"
FOR EACH ROW EXECUTE FUNCTION "prevent_plan_code_change"();

-- Protect the Basic rule even from direct eligibility writes.
CREATE FUNCTION "enforce_basic_vehicle_eligibility"()
RETURNS TRIGGER AS $$
DECLARE
    "selected_plan_code" "PlanCode";
BEGIN
    SELECT "code" INTO "selected_plan_code"
    FROM "plans"
    WHERE "id" = NEW."plan_id";

    IF
        "selected_plan_code" = 'BASIC'
        AND NEW."vehicle_type" IN ('SUV', 'PICKUP')
        AND NEW."allowed" = true
    THEN
        RAISE EXCEPTION 'Basic plan is not eligible for SUV or Pickup'
        USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "basic_vehicle_eligibility_trigger"
BEFORE INSERT OR UPDATE ON "plan_vehicle_eligibilities"
FOR EACH ROW EXECUTE FUNCTION "enforce_basic_vehicle_eligibility"();

-- Seed the four official plans as part of deployment.
INSERT INTO "plans" (
    "id",
    "code",
    "name",
    "description",
    "monthly_price_cents",
    "status",
    "display_order",
    "created_at",
    "updated_at"
)
VALUES
    ('00000000-0000-4000-8000-000000000001', 'BASIC', 'Basic', 'O essencial para manter seu veÃ­culo sempre limpo.', 7990, 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000002', 'ESSENTIAL', 'Essential', 'Mais frequÃªncia para a rotina do seu veÃ­culo.', 11990, 'ACTIVE', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000003', 'PREMIUM', 'Premium', 'Cobertura ampliada para quem cuida do carro toda semana.', 17990, 'ACTIVE', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000004', 'UNLIMITED', 'Ilimitado', 'Lavagens ilimitadas, respeitando uma utilizaÃ§Ã£o por dia.', 37990, 'ACTIVE', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "plan_benefits" (
    "plan_id",
    "mode",
    "washes_per_cycle",
    "max_uses_per_day",
    "created_at",
    "updated_at"
)
VALUES
    ('00000000-0000-4000-8000-000000000001', 'LIMITED', 2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000002', 'LIMITED', 4, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000003', 'LIMITED', 8, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000004', 'UNLIMITED', NULL, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "plan_vehicle_eligibilities" (
    "plan_id",
    "vehicle_type",
    "allowed",
    "created_at",
    "updated_at"
)
VALUES
    ('00000000-0000-4000-8000-000000000001', 'HATCH', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000001', 'SEDAN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000001', 'SUV', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000001', 'PICKUP', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000002', 'HATCH', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000002', 'SEDAN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000002', 'SUV', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000002', 'PICKUP', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000003', 'HATCH', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000003', 'SEDAN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000003', 'SUV', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000003', 'PICKUP', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000004', 'HATCH', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000004', 'SEDAN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000004', 'SUV', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000004', 'PICKUP', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
