import { describe, expect, it } from 'vitest';
import { darkPalette, designTokens, getThemePalette, lightPalette } from './design-tokens';

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

function collectHexValues(obj: Record<string, unknown>, prefix = ''): Array<[string, string]> {
  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      entries.push([path, value]);
    } else if (value && typeof value === 'object') {
      entries.push(...collectHexValues(value as Record<string, unknown>, path));
    }
  }
  return entries;
}

describe('FonoGames Design System Tokens', () => {
  it('light e dark palettes possuem exatamente as mesmas chaves de tokens', () => {
    const lightPaths = collectHexValues(lightPalette as unknown as Record<string, unknown>).map(
      ([path]) => path,
    );
    const darkPaths = collectHexValues(darkPalette as unknown as Record<string, unknown>).map(
      ([path]) => path,
    );

    expect(darkPaths).toEqual(lightPaths);
  });

  it('todos os tokens de cor são hexadecimais válidos', () => {
    for (const [mode, palette] of Object.entries(designTokens.colors)) {
      const hexEntries = collectHexValues(palette as unknown as Record<string, unknown>);
      for (const [path, value] of hexEntries) {
        expect(value, `${mode}.${path} inválido: ${value}`).toMatch(HEX_COLOR_REGEX);
      }
    }
  });

  it('getThemePalette retorna o tema correto para light e dark', () => {
    expect(getThemePalette('light')).toBe(lightPalette);
    expect(getThemePalette('dark')).toBe(darkPalette);
  });
});
