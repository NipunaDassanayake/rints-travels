-- CreateTable
CREATE TABLE "guide_reviews" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "tourist_id" UUID NOT NULL,
    "guide_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guide_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guide_reviews_booking_id_key" ON "guide_reviews"("booking_id");

-- CreateIndex
CREATE INDEX "guide_reviews_tourist_id_idx" ON "guide_reviews"("tourist_id");

-- CreateIndex
CREATE INDEX "guide_reviews_guide_id_idx" ON "guide_reviews"("guide_id");

-- CreateIndex
CREATE INDEX "guide_reviews_rating_idx" ON "guide_reviews"("rating");

-- AddForeignKey
ALTER TABLE "guide_reviews" ADD CONSTRAINT "guide_reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_reviews" ADD CONSTRAINT "guide_reviews_tourist_id_fkey" FOREIGN KEY ("tourist_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_reviews" ADD CONSTRAINT "guide_reviews_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "tour_guide_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
