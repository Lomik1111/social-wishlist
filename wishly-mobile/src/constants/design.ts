export const colors = {
  background: '#0A0A0F',
  surface: '#141420',
  surfaceElevated: '#1C1C2E',
  surfaceCard: '#1A1A2E',
  surfaceInput: '#1E1E2E',

  primary: '#FF2D78',
  primaryLight: '#FF6BA8',
  primaryDark: '#CC1F5F',
  primaryGlow: 'rgba(255, 45, 120, 0.25)',
  primarySubtle: 'rgba(255, 45, 120, 0.12)',

  purple: '#6C5CE7',
  purpleLight: 'rgba(108, 92, 231, 0.2)',

  textPrimary: '#FFFFFF',
  textSecondary: '#8A8AA0',
  textTertiary: '#4A4A6A',
  textMuted: '#2E2E4E',

  success: '#00D68F',
  successBg: 'rgba(0, 214, 143, 0.15)',
  warning: '#F6A623',
  danger: '#FF4444',
  dangerBg: 'rgba(255, 68, 68, 0.15)',
  info: '#0099FF',

  border: 'rgba(255, 255, 255, 0.08)',
  borderActive: 'rgba(255, 45, 120, 0.4)',
  separator: 'rgba(255, 255, 255, 0.05)',
  overlay: 'rgba(0, 0, 0, 0.7)',
} as const;

export const gradients = {
  primary: ['#FF2D78', '#FF6B35'] as const,
  purple: ['#6C5CE7', '#A29BFE'] as const,
  dark: ['#1C1C2E', '#0A0A0F'] as const,
  card: ['#1E1E2E', '#141420'] as const,
  success: ['#00D68F', '#00B894'] as const,
  featured: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)'] as const,
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 12,
  lg: 16, xl: 20, xxl: 24,
  xxxl: 32, huge: 48,
} as const;

export const radius = {
  sm: 8, md: 12, lg: 16,
  xl: 20, xxl: 24, full: 999,
} as const;

export const typography = {
  h1: { fontSize: 34, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 22, fontWeight: '700' as const },
  h4: { fontSize: 18, fontWeight: '600' as const },
  bodyLarge: { fontSize: 17, fontWeight: '400' as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: '400' as const },
  label: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const },
  price: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -1 },
} as const;

export const wishlistThemes = {
  deep_amethyst: {
    name: 'Глубокий Аметист',
    description: 'Мистический и спокойный',
    gradient: ['#1A0533', '#2D1B69'] as const,
    accent: '#A29BFE',
    icon: '💜',
  },
  midnight_emerald: {
    name: 'Полночный Изумруд',
    description: 'Свежий и натуральный',
    gradient: ['#0D2818', '#1A472A'] as const,
    accent: '#00B894',
    icon: '💚',
  },
  silver_fog: {
    name: 'Серебряный Туман',
    description: 'Строгий минимализм',
    gradient: ['#1C1C1E', '#2C2C2E'] as const,
    accent: '#8E8E93',
    icon: '🩶',
  },
  volcanic_ash: {
    name: 'Вулканический Пепел',
    description: 'Энергичный и тёплый',
    gradient: ['#2D0A0A', '#4A1A1A'] as const,
    accent: '#FF6348',
    icon: '🧡',
  },
} as const;

export const shadows = {
  glow: {
    shadowColor: '#FF2D78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;
