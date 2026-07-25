-- AlterTable
ALTER TABLE "package_images" ADD COLUMN     "altText" TEXT;

-- CreateIndex
CREATE INDEX "package_images_packageId_idx" ON "package_images"("packageId");

-- CreateIndex
CREATE INDEX "package_images_isPrimary_idx" ON "package_images"("isPrimary");
