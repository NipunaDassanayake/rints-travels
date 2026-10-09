-- CR-033 Stage 1: additive only; do not apply to the protected local database.
ALTER TABLE "refresh_tokens"
    ADD COLUMN "browser_binding_hash" VARCHAR(64),
    ADD COLUMN "refresh_generation" BIGINT,
    ADD COLUMN "refresh_recovery_ciphertext" TEXT,
    ADD COLUMN "refresh_recovery_expires_at" TIMESTAMP(3);

ALTER TABLE "refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_protocol_mode_check" CHECK (
        ("browser_binding_hash" IS NULL AND "refresh_generation" IS NULL
            AND "refresh_recovery_ciphertext" IS NULL AND "refresh_recovery_expires_at" IS NULL)
        OR
        ("browser_binding_hash" IS NOT NULL AND "refresh_generation" IS NOT NULL
            AND "browser_binding_hash" ~ '^[0-9a-f]{64}$' AND "refresh_generation" >= 0)
    ),
    ADD CONSTRAINT "refresh_tokens_recovery_pair_check" CHECK (
        ("refresh_recovery_ciphertext" IS NULL) = ("refresh_recovery_expires_at" IS NULL)
    ),
    ADD CONSTRAINT "refresh_tokens_recovery_predecessor_check" CHECK (
        "refresh_recovery_ciphertext" IS NULL OR
        ("previous_token_hash" IS NOT NULL AND "refresh_generation" IS NOT NULL
            AND "refresh_generation" > 0)
    ),
    ADD CONSTRAINT "refresh_tokens_revoked_recovery_check" CHECK (
        "browser_binding_hash" IS NULL OR "revoked_at" IS NULL OR
        ("refresh_recovery_ciphertext" IS NULL AND "refresh_recovery_expires_at" IS NULL)
    );
