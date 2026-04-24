-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- Seed default: week starts on Monday (1 = Monday per JS Date.getDay())
INSERT INTO "SystemSetting" (key, value) VALUES ('weekStartDay', '1') ON CONFLICT (key) DO NOTHING;
