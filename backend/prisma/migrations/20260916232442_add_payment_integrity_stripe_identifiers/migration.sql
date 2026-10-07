-- CreateEnum
CREATE TYPE "StripeWebhookEventStatus" AS ENUM ('PROCESSING', 'PROCESSED', 'FAILED');

-- DropIndex
DROP INDEX "payments_quotation_id_idx";

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "stripe_checkout_session_id" VARCHAR(255),
ADD COLUMN     "stripe_payment_intent_id" VARCHAR(255);

-- CreateTable
CREATE TABLE "stripe_webhook_events" (
    "id" VARCHAR(255) NOT NULL,
    "type" VARCHAR(255) NOT NULL,
    "status" "StripeWebhookEventStatus" NOT NULL DEFAULT 'PROCESSING',
    "claimed_at" TIMESTAMP(3) NOT NULL,
    "processed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_quotation_id_key" ON "payments"("quotation_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_checkout_session_id_key" ON "payments"("stripe_checkout_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_payment_intent_id_key" ON "payments"("stripe_payment_intent_id");

