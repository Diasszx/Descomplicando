import { TOTP, Secret } from 'otpauth';
import { TotpService } from './totp.service';

const TEST_HEX_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('TotpService (US2 — RFC 6238 + AES-256-GCM)', () => {
  let service: TotpService;

  beforeEach(() => {
    service = new TotpService(TEST_HEX_KEY);
  });

  it('deve cifrar e decifrar segredo Base32 com AES-256-GCM produzindo IV único e detectando adulteração', () => {
    const plainSecret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
    const encryptedA = service.encryptSecret(plainSecret);
    const encryptedB = service.encryptSecret(plainSecret);

    expect(encryptedA).not.toBe(plainSecret);
    expect(encryptedA).not.toBe(encryptedB);
    expect(encryptedA.split(':')).toHaveLength(3);

    expect(service.decryptSecret(encryptedA)).toBe(plainSecret);
    expect(service.decryptSecret(encryptedB)).toBe(plainSecret);

    const parts = encryptedA.split(':');
    const tampered = `${parts[0]}:${parts[1]}:${parts[2]?.slice(0, -2)}ff`;
    expect(() => service.decryptSecret(tampered)).toThrow();
  });

  it('deve gerar segredo Base32 de 160 bits e otpauthUri com issuer FonoGames', () => {
    const generated = service.generateEnrollment('profissional@fono.com');

    expect(generated.issuer).toBe('FonoGames');
    expect(generated.accountName).toBe('profissional@fono.com');
    expect(generated.manualEntryKey.length).toBeGreaterThanOrEqual(32);
    expect(generated.otpauthUri).toContain('otpauth://totp/');
    expect(generated.otpauthUri).toContain('issuer=FonoGames');
    expect(service.decryptSecret(generated.encryptedSecret)).toBe(generated.manualEntryKey);
  });

  it('deve validar código TOTP na janela atual e adjacente (±1 step de 30s) e rejeitar código incorreto', () => {
    const fixedNowMs = 1_732_180_200_000;
    const secret = new Secret({ size: 20 });
    const totp = new TOTP({
      issuer: 'FonoGames',
      label: 'admin@fono.com',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });

    const currentCode = totp.generate({ timestamp: fixedNowMs });
    const prevStepCode = totp.generate({ timestamp: fixedNowMs - 30_000 });
    const nextStepCode = totp.generate({ timestamp: fixedNowMs + 30_000 });
    const expiredCode = totp.generate({ timestamp: fixedNowMs - 90_000 });

    const currentResult = service.verifyCode({
      base32Secret: secret.base32,
      code: currentCode,
      lastUsedStep: null,
      nowMs: fixedNowMs,
    });
    expect(currentResult.valid).toBe(true);
    expect(currentResult.matchedStep).toBe(Math.floor(fixedNowMs / 30_000));

    const prevResult = service.verifyCode({
      base32Secret: secret.base32,
      code: prevStepCode,
      lastUsedStep: null,
      nowMs: fixedNowMs,
    });
    expect(prevResult.valid).toBe(true);
    expect(prevResult.matchedStep).toBe(Math.floor(fixedNowMs / 30_000) - 1);

    const nextResult = service.verifyCode({
      base32Secret: secret.base32,
      code: nextStepCode,
      lastUsedStep: null,
      nowMs: fixedNowMs,
    });
    expect(nextResult.valid).toBe(true);

    const expiredResult = service.verifyCode({
      base32Secret: secret.base32,
      code: expiredCode,
      lastUsedStep: null,
      nowMs: fixedNowMs,
    });
    expect(expiredResult.valid).toBe(false);

    const wrongResult = service.verifyCode({
      base32Secret: secret.base32,
      code: currentCode === '000000' ? '111111' : '000000',
      lastUsedStep: null,
      nowMs: fixedNowMs,
    });
    expect(wrongResult.valid).toBe(false);
  });

  it('deve bloquear replay quando matchedStep <= lastUsedStep', () => {
    const fixedNowMs = 1_732_180_200_000;
    const currentStep = Math.floor(fixedNowMs / 30_000);
    const secret = new Secret({ size: 20 });
    const totp = new TOTP({
      issuer: 'FonoGames',
      label: 'pro@fono.com',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });
    const code = totp.generate({ timestamp: fixedNowMs });

    const replaySameStep = service.verifyCode({
      base32Secret: secret.base32,
      code,
      lastUsedStep: currentStep,
      nowMs: fixedNowMs,
    });
    expect(replaySameStep.valid).toBe(false);

    const replayOlderStep = service.verifyCode({
      base32Secret: secret.base32,
      code,
      lastUsedStep: currentStep + 1,
      nowMs: fixedNowMs,
    });
    expect(replayOlderStep.valid).toBe(false);
  });
});
