/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./editor.html",
    "./src/editor/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Match markdown-editor theme exactly
        retro: {
          bg: '#0c0a09',      // Stone-950 (Warm black)
          panel: '#1c1917',   // Stone-900 (Faded/Mature black)
          surface: '#292524', // Stone-800
          red: '#ff2a6d',
          blue: '#38bdf8',    // Sky-400 (Less distracting than neon cyan)
          green: '#00ff9f',
          yellow: '#facc15',  // Yellow-400 (Distinct from blue)
          purple: '#bd00ff',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'retro': '4px 4px 0px 0px rgba(56, 189, 248, 0.2)',
        'retro-hover': '2px 2px 0px 0px rgba(56, 189, 248, 0.4)',
        'retro-sm': '2px 2px 0px 0px rgba(56, 189, 248, 0.2)',
      }
    },
  },
  plugins: [],
}
