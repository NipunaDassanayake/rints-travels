-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "tour_quotations" (
    "id" UUID NOT NULL,
    "tour_request_id" UUID NOT NULL,
    "guide_id" UUID,
    "quotation_number" VARCHAR(50) NOT NULL,
    "revision_number" INTEGER NOT NULL DEFAULT 1,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "adult_count" INTEGER NOT NULL,
    "child_count" INTEGER NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "terms_conditions" TEXT,
    "valid_until" TIMESTAMP(3),
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "sent_at" TIMESTAMP(3),
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tour_quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_itineraries" (
    "id" SERIAL NOT NULL,
    "quotation_id" UUID NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "quotation_itineraries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_inclusions" (
    "id" SERIAL NOT NULL,
    "quotation_id" UUID NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "quotation_inclusions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_exclusions" (
    "id" SERIAL NOT NULL,
    "quotation_id" UUID NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "quotation_exclusions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tour_quotations_quotation_number_key" ON "tour_quotations"("quotation_number");

-- CreateIndex
CREATE INDEX "tour_quotations_tour_request_id_idx" ON "tour_quotations"("tour_request_id");

-- CreateIndex
CREATE INDEX "tour_quotations_guide_id_idx" ON "tour_quotations"("guide_id");

-- CreateIndex
CREATE INDEX "tour_quotations_status_idx" ON "tour_quotations"("status");

-- CreateIndex
CREATE INDEX "tour_quotations_valid_until_idx" ON "tour_quotations"("valid_until");

-- CreateIndex
CREATE UNIQUE INDEX "tour_quotations_tour_request_id_revision_number_key" ON "tour_quotations"("tour_request_id", "revision_number");

-- CreateIndex
CREATE INDEX "quotation_itineraries_quotation_id_idx" ON "quotation_itineraries"("quotation_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotation_itineraries_quotation_id_dayNumber_key" ON "quotation_itineraries"("quotation_id", "dayNumber");

-- CreateIndex
CREATE INDEX "quotation_inclusions_quotation_id_idx" ON "quotation_inclusions"("quotation_id");

-- CreateIndex
CREATE INDEX "quotation_exclusions_quotation_id_idx" ON "quotation_exclusions"("quotation_id");

-- AddForeignKey
ALTER TABLE "tour_quotations" ADD CONSTRAINT "tour_quotations_tour_request_id_fkey" FOREIGN KEY ("tour_request_id") REFERENCES "tour_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_quotations" ADD CONSTRAINT "tour_quotations_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "tour_guide_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_itineraries" ADD CONSTRAINT "quotation_itineraries_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "tour_quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_inclusions" ADD CONSTRAINT "quotation_inclusions_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "tour_quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_exclusions" ADD CONSTRAINT "quotation_exclusions_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "tour_quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
