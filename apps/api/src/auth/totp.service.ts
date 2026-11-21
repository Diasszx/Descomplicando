import { Injectable, Optional } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Secret, TOTP } from 'otpauth';
import { env, parseMfaEncryptionKey } from '../config/env';

const CIPHER_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;
const TOTP_ISSUER = 'FonoGames' as const;
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1;

export interface TotpEnrollmentResult {
  otpauthUri: string;
  manualEntryKey: string;
  issuer: typeof TOTP_ISSUER;
  accountName: string;
  encryptedSecret: string;
}

export interface VerifyTotpInput {
  base32Secret: string;
  code: string;
  lastUsedStep: number | null;
  nowMs?: number;
}

export interface VerifyTotpResult {
  valid: boolean;
  matchedStep: number | null;
}

@Injectable()
export class TotpService {
  private readonly encryptionKey: Buffer;

  constructor(@Optional() keyOverride?: string) {
    const rawKey = keyOverride ?? env.MFA_ENCRYPTION_KEY;
    const parsedKey = parseMfaEncryptionKey(rawKey);
    if (!parsedKey) {
      throw new Error('MFA_ENCRYPTION_KEY inválida para cifragem AES-256-GCM.');
    }
    this.encryptionKey = parsedKey;
  }

  encryptSecret(plainBase32Secret: string): string {
    const iv = randomBytes(IV_LENGTH_BYTES);
    const cipher = createCipheriv(CIPHER_ALGORITHM, this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(plainBase32Secret, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decryptSecret(encryptedPayload: string): string {
    const parts = encryptedPayload.split(':');
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      throw new Error('Formato de segredo MFA cifrado inválido.');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const ciphertext = Buffer.from(parts[2], 'hex');

    const decipher = createDecipheriv(CIPHER_ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  }

  generateEnrollment(accountEmail: string): TotpEnrollmentResult {
    const normalizedEmail = accountEmail.trim().toLowerCase();
    const secret = new Secret({ size: 20 });
    const totp = new TOTP({
      issuer: TOTP_ISSUER,
      label: normalizedEmail,
      algorithm: 'SHA1',
      digits: TOTP_DIGITS,
      period: TOTP_PERIOD_SECONDS,
      secret,
    });

    const manualEntryKey = secret.base32;
    return {
      otpauthUri: totp.toString(),
      manualEntryKey,
      issuer: TOTP_ISSUER,
      accountName: normalizedEmail,
      encryptedSecret: this.encryptSecret(manualEntryKey),
    };
  }

  verifyCode(input: VerifyTotpInput): VerifyTotpResult {
    const nowMs = input.nowMs ?? Date.now();
    const totp = new TOTP({
      issuer: TOTP_ISSUER,
      algorithm: 'SHA1',
      digits: TOTP_DIGITS,
      period: TOTP_PERIOD_SECONDS,
      secret: Secret.fromBase32(input.base32Secret),
    });

    const delta = totp.validate({
      token: input.code.trim(),
      window: TOTP_WINDOW,
      timestamp: nowMs,
    });

    if (delta === null) {
      return { valid: false, matchedStep: null };
    }

    const currentStep = Math.floor(nowMs / (TOTP_PERIOD_SECONDS * 1000));
    const matchedStep = currentStep + delta;

    // Anti-replay: impede reuso de código TOTP no mesmo passo ou anterior
    if (input.lastUsedStep !== null && matchedStep <= input.lastUsedStep) {
      return { valid: false, matchedStep: null };
    }

    return { valid: true, matchedStep };
  }
}
