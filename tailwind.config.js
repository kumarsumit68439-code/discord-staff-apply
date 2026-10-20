/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        discord: {
          blurple: '#5865F2',
          green: '#57F287',
          yellow: '#FEE75C',
          fuchsia: '#EB459E',
          red: '#ED4245',
          dark: '#1E1F22',
          darker: '#0C0D10',
          card: '#2B2D31',
          online: '#23A559',
        },
      },
      boxShadow: {
        glow: '0 0 40px rgba(88, 101, 242, 0.25)',
        'glow-sm': '0 0 20px rgba(88, 101, 242, 0.2)',
      },
    },
  },
  plugins: [],
};
