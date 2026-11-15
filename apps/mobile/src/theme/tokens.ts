import { useColorScheme } from 'react-native';
import { designTokens, getThemePalette, lightPalette, type ColorPalette } from '@fono/shared';

export const colors = lightPalette;
export const radius = designTokens.radius;
export const spacing = designTokens.spacing;
export const typography = designTokens.typography;

export function useThemeColors(): ColorPalette {
  const colorScheme = useColorScheme();
  return getThemePalette(colorScheme === 'dark' ? 'dark' : 'light');
}
