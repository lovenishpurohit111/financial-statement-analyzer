module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Playfair Display'", "Georgia", "serif"],
        body:    ["'IBM Plex Sans'", "system-ui", "sans-serif"],
        mono:    ["'IBM Plex Mono'", "'Courier New'", "monospace"],
      },
      colors: {
        cream:  { DEFAULT:'#F7F4EE', dark:'#EDE9DF' },
        ink:    { DEFAULT:'#1A1009', light:'#3D3525', muted:'#8A7F70', faint:'#C4BAA8' },
        crimson:{ DEFAULT:'#C41E3A', dark:'#9E1830', light:'#E8536A', pale:'#FCEEF1' },
        forest: { DEFAULT:'#1B6535', light:'#2D9150', pale:'#EAF6EE' },
        amber:  { DEFAULT:'#B45309', pale:'#FEF3C7' },
        ocean:  { DEFAULT:'#1E40AF', pale:'#EFF6FF' },
      },
    },
  },
  plugins: [],
};
