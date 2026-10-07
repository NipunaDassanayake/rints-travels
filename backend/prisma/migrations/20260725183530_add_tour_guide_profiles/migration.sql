-- CreateTable
CREATE TABLE "tour_guide_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "bio" TEXT,
    "experience_years" INTEGER NOT NULL DEFAULT 0,
    "languages" TEXT[],
    "specializations" TEXT[],
    "location" VARCHAR(150),
    "daily_rate" DECIMAL(12,2),
    "average_rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "total_reviews" INTEGER NOT NULL DEFAULT 0,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tour_guide_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tour_guide_profiles_user_id_key" ON "tour_guide_profiles"("user_id");

-- CreateIndex
CREATE INDEX "tour_guide_profiles_location_idx" ON "tour_guide_profiles"("location");

-- CreateIndex
CREATE INDEX "tour_guide_profiles_is_available_idx" ON "tour_guide_profiles"("is_available");

-- AddForeignKey
ALTER TABLE "tour_guide_profiles" ADD CONSTRAINT "tour_guide_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
