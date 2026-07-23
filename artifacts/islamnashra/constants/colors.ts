/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    background: '#F5F0E8',
    foreground: '#0A0A0A',
    card: '#FFFFFF',
    cardForeground: '#0A0A0A',
    primary: '#0F5C3F',
    primaryForeground: '#FFFFFF',
    secondary: '#E8E2D6',
    secondaryForeground: '#1A1A1A',
    muted: '#E8E2D6',
    mutedForeground: '#6B6658',
    accent: '#C9A84C',
    accentForeground: '#1A1A1A',
    destructive: '#C0392B',
    destructiveForeground: '#FFFFFF',
    border: '#D4CDBE',
    input: '#D4CDBE',
    text: '#0A0A0A',
    tint: '#0F5C3F',
  },
  dark: {
    background: '#0D1117',
    foreground: '#F0EDE8',
    card: '#161B22',
    cardForeground: '#F0EDE8',
    primary: '#1A7A53',
    primaryForeground: '#FFFFFF',
    secondary: '#21262D',
    secondaryForeground: '#E0DDD8',
    muted: '#21262D',
    mutedForeground: '#8B949E',
    accent: '#D4AF5A',
    accentForeground: '#0D1117',
    destructive: '#E74C3C',
    destructiveForeground: '#FFFFFF',
    border: '#30363D',
    input: '#30363D',
    text: '#F0EDE8',
    tint: '#1A7A53',
  },
  radius: 12,
};

export default colors;
