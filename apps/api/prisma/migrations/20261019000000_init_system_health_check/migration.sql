-- CreateTable
CREATE TABLE "system_health_checks" (
    "id" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ok',

    CONSTRAINT "system_health_checks_pkey" PRIMARY KEY ("id")
);
