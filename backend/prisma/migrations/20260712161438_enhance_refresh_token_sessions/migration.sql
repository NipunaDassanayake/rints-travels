/*
  Warnings:

  - A unique constraint covering the columns `[session_id]` on the table `refresh_tokens` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `session_id` to the `refresh_tokens` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "device_name" VARCHAR(150),
ADD COLUMN     "ip_address" VARCHAR(64),
ADD COLUMN     "last_used_at" TIMESTAMP(3),
ADD COLUMN     "session_id" UUID NOT NULL,
ADD COLUMN     "user_agent" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_session_id_key" ON "refresh_tokens"("session_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_revoked_at_idx" ON "refresh_tokens"("revoked_at");
