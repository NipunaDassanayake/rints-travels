-- CreateEnum
CREATE TYPE "BookingLifecycleAction" AS ENUM ('START', 'COMPLETE');

-- CreateEnum
CREATE TYPE "BookingLifecycleChallengeInvalidation" AS ENUM ('REPLACED', 'EXPIRED', 'ATTEMPTS_EXHAUSTED', 'BOOKING_CANCELLED', 'GUIDE_REASSIGNED');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "started_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "booking_lifecycle_challenges" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "action" "BookingLifecycleAction" NOT NULL,
    "code_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "created_by_user_id" UUID NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "consumed_by_user_id" UUID,
    "invalidated_at" TIMESTAMP(3),
    "invalidation_reason" "BookingLifecycleChallengeInvalidation",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_lifecycle_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_lifecycle_challenges_booking_id_action_created_at_idx" ON "booking_lifecycle_challenges"("booking_id", "action", "created_at");

-- AddForeignKey
ALTER TABLE "booking_lifecycle_challenges" ADD CONSTRAINT "booking_lifecycle_challenges_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
