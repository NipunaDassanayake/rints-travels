-- AlterTable
ALTER TABLE "travel_packages" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "travel_packages_status_idx" ON "travel_packages"("status");

-- CreateIndex
CREATE INDEX "travel_packages_deleted_at_idx" ON "travel_packages"("deleted_at");
