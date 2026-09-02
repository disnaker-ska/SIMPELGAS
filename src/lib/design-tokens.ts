/**
 * SIMPELGAS Design Tokens (Single Source of Truth)
 * Sesuai spesifikasi palet Warm Sunset / Terracotta Rose
 */

export const DESIGN_TOKENS = {
  colors: {
    // Brand Warm Sunset Spectrum
    primary: {
      default: '#FB9B8F', // Warm Coral / Sunset Salmon
      hover: '#F08577',   // Deep Coral
      text: '#431407',    // Deep Espresso (WCAG AAA contrast on coral)
      dark: '#C2410C',    // Terracotta 700 (text on light)
      soft: '#FFF3F0',    // Coral Soft Tint
    },
    secondary: {
      default: '#F57799', // Rose Blossom / Raspberry Pink
      hover: '#E65A80',   // Deep Rose
      text: '#500724',    // Deep Berry (WCAG AAA contrast on rose)
      dark: '#BE185D',    // Pink 700
      soft: '#FDF2F5',    // Rose Soft Tint
    },
    accent: {
      default: '#FDC3A1', // Soft Apricot / Warm Peach
      hover: '#FBA87B',   // Deep Peach
      text: '#451A03',    // Dark Mocha (WCAG AAA contrast on peach)
      soft: '#FFF7CD',    // Custard Cream / Vanilla Soft Glow
    },
    // Dark anchor & warm neutrals (Zero dark navy blue)
    darkAnchor: '#1C1917', // Warm Espresso Charcoal
    slate: {
      900: '#1C1917', // Warm Charcoal (Sidebar / Dark headers)
      800: '#292524', // Warm Charcoal Border
      700: '#44403C', // Warm Charcoal Text
      600: '#57534E',
      500: '#78716C',
      400: '#A8A29E',
      200: '#E7E5E4',
      100: '#F5F5F4',
      50: '#FAFAF9',
    },
    // Semantics
    success: {
      default: '#059669', // Emerald 600
      soft: '#ECFDF5',    // Emerald 50
      border: '#A7F3D0',  // Emerald 200
    },
    warning: {
      default: '#D97706', // Amber 600
      soft: '#FFFBEB',    // Amber 50
      border: '#FDE68A',  // Amber 200
    },
    destructive: {
      default: '#DC2626', // Red 600
      soft: '#FEF2F2',    // Red 50
      border: '#FECACA',  // Red 200
    },
  },
  charts: {
    bidang: ['#FB9B8F', '#F57799', '#FDC3A1', '#059669', '#78716C'],
  },
  sweetAlert: {
    confirmButtonColor: '#FB9B8F',
    confirmButtonTextColor: '#431407',
    secondaryConfirmButtonColor: '#F57799',
    destructiveConfirmButtonColor: '#DC2626',
    cancelButtonColor: '#78716C',
  },
} as const
