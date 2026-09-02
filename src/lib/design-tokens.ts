/**
 * SIMPELGAS Design Tokens (Single Source of Truth)
 * Sesuai spesifikasi docs/DOKUMEN_REFERENSI_TEKNIS/UIUX_DESIGN.md - Civic Spectrum
 */

export const DESIGN_TOKENS = {
  colors: {
    // Brand
    primary: {
      default: '#38BDF8', // Sky 400
      hover: '#0EA5E9',   // Sky 500
      text: '#082F49',    // Text on primary
      dark: '#0369A1',    // Sky 700 (text on light)
      soft: '#F0F9FF',    // Sky 50
    },
    secondary: {
      default: '#EC69B5', // Pink 400
      hover: '#DB4FA3',   // Pink 500
      text: '#500724',    // Text on secondary
      dark: '#BE185D',    // Pink 700
      soft: '#FDF2F8',    // Pink 50
    },
    accent: {
      default: '#9B7FEA', // Violet 400
      hover: '#7C3AED',   // Violet 600
      text: '#1E1B4B',    // Text on accent
      soft: '#F5F3FF',    // Violet 50
    },
    // Dark anchor & neutrals
    darkAnchor: '#0F172A', // Slate 900 / Navy 900
    slate: {
      900: '#0F172A',
      700: '#334155',
      600: '#475569',
      500: '#64748B',
      400: '#94A3B8',
      200: '#E2E8F0',
      100: '#F1F5F9',
      50: '#F8FAFC',
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
    bidang: ['#38BDF8', '#EC69B5', '#9B7FEA', '#059669', '#64748B'],
  },
  sweetAlert: {
    confirmButtonColor: '#38BDF8',
    confirmButtonTextColor: '#082F49',
    secondaryConfirmButtonColor: '#EC69B5',
    destructiveConfirmButtonColor: '#DC2626',
    cancelButtonColor: '#64748B',
  },
} as const
