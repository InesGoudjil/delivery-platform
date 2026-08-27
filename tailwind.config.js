/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0A0A0B',
        bg2: '#141416',
        bg3: '#1C1C20',
        line: 'rgba(255,255,255,.08)',
        line2: 'rgba(255,255,255,.15)',
        ink: '#F6F3EC',
        dim: '#9A9A9F',
        faint: '#5E5E64',
        orange: '#F5551D',
        orange2: '#FF8A45',
        sage: '#86B98F',
        grey: '#6B7580',
      },
      fontFamily: {
        display: ['var(--font-satoshi)', 'sans-serif'],
        sans: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl2: '20px',
        xl3: '24px',
      },
      keyframes: {
        kbzoom: {
          from: { backgroundSize: '118%' },
          to: { backgroundSize: '140%' },
        },
        heroIn: {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'none' },
        },
        fadeUp: {
          from: { opacity: 0, transform: 'translateY(14px)' },
          to: { opacity: 1, transform: 'none' },
        },
        surfaceIn: {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'none' },
        },
      },
      animation: {
        kbzoom: 'kbzoom 28s ease-in-out infinite alternate',
        heroIn: 'heroIn .9s cubic-bezier(.16,.8,.24,1) backwards',
        fadeUp: 'fadeUp .55s cubic-bezier(.16,.8,.24,1) backwards',
        surfaceIn: 'surfaceIn .5s cubic-bezier(.16,.8,.24,1) backwards',
      },
    },
  },
  plugins: [],
};
