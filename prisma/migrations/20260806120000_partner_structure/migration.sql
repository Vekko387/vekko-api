CREATE TYPE "PartnerPhotoType" AS ENUM ('LOGO', 'FACADE', 'SERVICE_AREA');

ALTER TABLE "partner_applications"
  ADD COLUMN "responsible_cpf_normalized" VARCHAR(11),
  ADD COLUMN "responsible_phone" VARCHAR(13),
  ADD COLUMN "responsible_email" VARCHAR(320),
  ADD COLUMN "responsible_role" VARCHAR(100),
  ADD COLUMN "whatsapp_normalized" VARCHAR(13),
  ADD COLUMN "website_or_instagram" VARCHAR(255);

UPDATE "partner_applications"
SET
  "responsible_phone" = "contact_phone",
  "responsible_email" = "contact_email",
  "responsible_role" = 'Responsável',
  "whatsapp_normalized" = "contact_phone"
WHERE
  "responsible_phone" IS NULL
  OR "responsible_email" IS NULL
  OR "responsible_role" IS NULL
  OR "whatsapp_normalized" IS NULL;

ALTER TABLE "partner_applications"
  ALTER COLUMN "responsible_phone" SET NOT NULL,
  ALTER COLUMN "responsible_email" SET NOT NULL,
  ALTER COLUMN "responsible_role" SET NOT NULL,
  ALTER COLUMN "whatsapp_normalized" SET NOT NULL;

ALTER TABLE "partners"
  ADD COLUMN "responsible_name" VARCHAR(160),
  ADD COLUMN "responsible_cpf_normalized" VARCHAR(11),
  ADD COLUMN "responsible_phone" VARCHAR(13),
  ADD COLUMN "responsible_email" VARCHAR(320),
  ADD COLUMN "responsible_role" VARCHAR(100),
  ADD COLUMN "whatsapp_normalized" VARCHAR(13),
  ADD COLUMN "website_or_instagram" VARCHAR(255);

UPDATE "partners" AS "partner"
SET
  "responsible_name" = "application"."responsible_name",
  "responsible_cpf_normalized" = "application"."responsible_cpf_normalized",
  "responsible_phone" = "application"."responsible_phone",
  "responsible_email" = "application"."responsible_email",
  "responsible_role" = "application"."responsible_role",
  "whatsapp_normalized" = "application"."whatsapp_normalized",
  "website_or_instagram" = "application"."website_or_instagram"
FROM "partner_applications" AS "application"
WHERE "application"."id" = "partner"."application_id";

ALTER TABLE "partners"
  ALTER COLUMN "responsible_name" SET NOT NULL,
  ALTER COLUMN "responsible_phone" SET NOT NULL,
  ALTER COLUMN "responsible_email" SET NOT NULL,
  ALTER COLUMN "responsible_role" SET NOT NULL,
  ALTER COLUMN "whatsapp_normalized" SET NOT NULL;

CREATE TABLE "partner_photos" (
  "id" UUID NOT NULL,
  "partner_id" UUID NOT NULL,
  "type" "PartnerPhotoType" NOT NULL,
  "url" VARCHAR(2048) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "partner_photos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_photos_partner_id_type_key"
  ON "partner_photos"("partner_id", "type");

CREATE INDEX "partner_photos_partner_id_idx"
  ON "partner_photos"("partner_id");

ALTER TABLE "partner_photos"
  ADD CONSTRAINT "partner_photos_partner_id_fkey"
  FOREIGN KEY ("partner_id") REFERENCES "partners"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
