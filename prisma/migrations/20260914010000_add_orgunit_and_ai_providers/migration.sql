ALTER TABLE "users" ADD COLUMN "orgUnit" TEXT;
ALTER TABLE "ai_settings" ADD COLUMN "openaiKeyEnc" TEXT;
ALTER TABLE "ai_settings" ADD COLUMN "geminiKeyEnc" TEXT;
ALTER TABLE "ai_settings" ADD COLUMN "featureProviders" JSONB NOT NULL DEFAULT '{}';
