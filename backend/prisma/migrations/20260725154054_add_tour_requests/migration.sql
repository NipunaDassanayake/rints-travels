-- CreateEnum
CREATE TYPE "TourRequestType" AS ENUM ('PACKAGE_BASED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TourRequestStatus" AS ENUM ('PENDING_REVIEW', 'UNDER_DISCUSSION', 'READY_FOR_QUOTATION', 'QUOTATION_SENT', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'BOOKED');

-- CreateEnum
CREATE TYPE "ContactMethod" AS ENUM ('WHATSAPP', 'PHONE', 'EMAIL');

-- CreateTable
CREATE TABLE "tour_requests" (
    "id" UUID NOT NULL,
    "tourist_id" UUID NOT NULL,
    "package_id" INTEGER,
    "preferred_guide_id" UUID,
    "assigned_admin_id" UUID,
    "request_type" "TourRequestType" NOT NULL,
    "title" VARCHAR(200),
    "preferred_start_date" DATE NOT NULL,
    "preferred_end_date" DATE,
    "adult_count" INTEGER NOT NULL DEFAULT 1,
    "child_count" INTEGER NOT NULL DEFAULT 0,
    "destination_preferences" TEXT,
    "budget" DECIMAL(12,2),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "hotel_preference" VARCHAR(100),
    "transport_preference" VARCHAR(100),
    "special_requirements" TEXT,
    "contact_method" "ContactMethod",
    "status" "TourRequestStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tour_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tour_requests_tourist_id_idx" ON "tour_requests"("tourist_id");

-- CreateIndex
CREATE INDEX "tour_requests_package_id_idx" ON "tour_requests"("package_id");

-- CreateIndex
CREATE INDEX "tour_requests_status_idx" ON "tour_requests"("status");

-- CreateIndex
CREATE INDEX "tour_requests_request_type_idx" ON "tour_requests"("request_type");

-- CreateIndex
CREATE INDEX "tour_requests_preferred_start_date_idx" ON "tour_requests"("preferred_start_date");

-- AddForeignKey
ALTER TABLE "tour_requests" ADD CONSTRAINT "tour_requests_tourist_id_fkey" FOREIGN KEY ("tourist_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_requests" ADD CONSTRAINT "tour_requests_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "travel_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
