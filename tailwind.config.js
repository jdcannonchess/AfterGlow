/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Autumn forest at dusk - deep earthy tones
        board: {
          bg: '#1a1612',        // Deep forest floor
          surface: '#252019',   // Bark brown
          elevated: '#302820',  // Weathered wood
          border: '#3d3428',    // Shadow in leaves
          muted: '#6b5d4d',     // Twilight mist
        },
        // Priority colors - Fall leaf spectrum
        priority: {
          p0: '#c94a3a',        // Urgent red maple
          p1: '#d47a3a',        // Orange oak leaf
          p2: '#8a7a6a',        // Bark neutral
          p3: '#6a5a4a',        // Dried leaf
          p4: '#4a3a2a',        // Shadow brown
        },
        // Status colors - Forest elements
        status: {
          active: '#5d8a4d',    // Moss green
          waiting: '#8b6b9c',   // Dusk purple
          blocked: '#a64b3c',   // Rust/decay
          review: '#5c7a9c',    // Twilight blue
        },
        // Accent - Sunset through trees
        accent: {
          gold: '#d4915c',      // Golden hour light
          amber: '#c76f32',     // Sunset orange
          warm: '#e5a84b',      // Fall leaf gold
        },
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
