-- CreateIndex
CREATE INDEX "tour_requests_preferred_guide_id_idx" ON "tour_requests"("preferred_guide_id");

-- CreateIndex
CREATE INDEX "tour_requests_assigned_admin_id_idx" ON "tour_requests"("assigned_admin_id");

-- AddForeignKey
ALTER TABLE "tour_requests" ADD CONSTRAINT "tour_requests_preferred_guide_id_fkey" FOREIGN KEY ("preferred_guide_id") REFERENCES "tour_guide_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
