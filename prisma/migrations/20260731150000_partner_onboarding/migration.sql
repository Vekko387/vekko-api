-- CreateEnum
CREATE TYPE "PartnerApplicationStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PartnerMemberRole" AS ENUM ('OWNER', 'MANAGER', 'EMPLOYEE');

-- CreateTable
CREATE TABLE "partner_applications" (
    "id" UUID NOT NULL,
    "legal_name" VARCHAR(160) NOT NULL,
    "trade_name" VARCHAR(160) NOT NULL,
    "cnpj_normalized" VARCHAR(14) NOT NULL,
    "responsible_name" VARCHAR(160) NOT NULL,
    "contact_email" VARCHAR(320) NOT NULL,
    "contact_phone" VARCHAR(13) NOT NULL,
    "postal_code_normalized" VARCHAR(8) NOT NULL,
    "street" VARCHAR(160) NOT NULL,
    "address_number" VARCHAR(30) NOT NULL,
    "address_complement" VARCHAR(120),
    "neighborhood" VARCHAR(120) NOT NULL,
    "city" VARCHAR(120) NOT NULL,
    "state" CHAR(2) NOT NULL,
    "business_category" VARCHAR(100) NOT NULL,
    "service_description" VARCHAR(1000) NOT NULL,
    "status" "PartnerApplicationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "terms_accepted_at" TIMESTAMPTZ(3) NOT NULL,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(3),
    "reviewed_by_id" UUID,
    "rejection_reason" VARCHAR(500),
    "invitation_sent_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "partner_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "legal_name" VARCHAR(160) NOT NULL,
    "trade_name" VARCHAR(160) NOT NULL,
    "cnpj_normalized" VARCHAR(14) NOT NULL,
    "contact_email" VARCHAR(320) NOT NULL,
    "contact_phone" VARCHAR(13) NOT NULL,
    "postal_code_normalized" VARCHAR(8) NOT NULL,
    "street" VARCHAR(160) NOT NULL,
    "address_number" VARCHAR(30) NOT NULL,
    "address_complement" VARCHAR(120),
    "neighborhood" VARCHAR(120) NOT NULL,
    "city" VARCHAR(120) NOT NULL,
    "state" CHAR(2) NOT NULL,
    "business_category" VARCHAR(100) NOT NULL,
    "service_description" VARCHAR(1000) NOT NULL,
    "status" "PartnerStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_members" (
    "partner_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "PartnerMemberRole" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "partner_members_pkey" PRIMARY KEY ("partner_id", "user_id")
);

-- CreateIndex
CREATE INDEX "partner_applications_contact_email_idx" ON "partner_applications"("contact_email");

-- CreateIndex
CREATE INDEX "partner_applications_status_submitted_at_idx" ON "partner_applications"("status", "submitted_at");

-- Only one active or pending onboarding flow may exist for a CNPJ.
CREATE UNIQUE INDEX "partner_applications_active_cnpj_key" ON "partner_applications"("cnpj_normalized")
WHERE "status" IN ('PENDING_REVIEW', 'APPROVED');

-- CreateIndex
CREATE UNIQUE INDEX "partners_application_id_key" ON "partners"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "partners_cnpj_normalized_key" ON "partners"("cnpj_normalized");

-- CreateIndex
CREATE INDEX "partner_members_user_id_idx" ON "partner_members"("user_id");

-- AddForeignKey
ALTER TABLE "partner_applications" ADD CONSTRAINT "partner_applications_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "partner_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_members" ADD CONSTRAINT "partner_members_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_members" ADD CONSTRAINT "partner_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
