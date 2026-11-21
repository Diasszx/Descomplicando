-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PROFISSIONAL', 'PACIENTE', 'AUTONOMO');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "firebase_uid" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "role" "UserRole" NOT NULL DEFAULT 'AUTONOMO',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "password_changed_at" TIMESTAMP(3),
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret_encrypted" TEXT,
    "mfa_pending_secret_encrypted" TEXT,
    "mfa_enrolled_at" TIMESTAMP(3),
    "mfa_last_used_step" INTEGER,
    "last_login_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_mfa_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "firebase_auth_time" INTEGER NOT NULL,
    "verified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "user_mfa_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_firebase_uid_key" ON "users"("firebase_uid");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "user_mfa_sessions_user_id_revoked_at_idx" ON "user_mfa_sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_mfa_sessions_user_id_firebase_auth_time_key" ON "user_mfa_sessions"("user_id", "firebase_auth_time");

-- AddForeignKey
ALTER TABLE "user_mfa_sessions" ADD CONSTRAINT "user_mfa_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
