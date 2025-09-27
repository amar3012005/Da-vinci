module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'display': ['Orbitron', 'Space Grotesk', 'SF Pro Display', 'system-ui', 'sans-serif'],
        'body': ['Rajdhani', 'Space Grotesk', 'system-ui', 'sans-serif'],
        'futuristic': ['Orbitron', 'monospace'],
        'tech': ['Space Grotesk', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Courier Prime', 'Fira Code', 'monospace'],
        'elegant': ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
        'luxury': ['Playfair Display', 'Georgia', 'serif'],
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        },
        glow: {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3)',
          },
          '50%': { 
            boxShadow: '0 0 40px rgba(59, 130, 246, 0.8), 0 0 80px rgba(59, 130, 246, 0.6)',
          }
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' }
        },
        'float-box': {
          '0%, 100%': { 
            transform: 'translateY(0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)',
            opacity: '0.3'
          },
          '25%': { 
            transform: 'translateY(-20px) rotateX(15deg) rotateY(15deg) rotateZ(5deg)',
            opacity: '0.6'
          },
          '50%': { 
            transform: 'translateY(-10px) rotateX(-10deg) rotateY(25deg) rotateZ(-10deg)',
            opacity: '0.8'
          },
          '75%': { 
            transform: 'translateY(-30px) rotateX(20deg) rotateY(-15deg) rotateZ(15deg)',
            opacity: '0.4'
          }
        },
        'box-float': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg)' },
          '50%': { transform: 'translate3d(-10px, -20px, 10px) rotateX(15deg) rotateY(15deg)' }
        },
        'slide': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        'matrix-rain': {
          '0%': { transform: 'translateY(-100vh)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translateY(100vh)', opacity: '0' }
        },
        'cyber-glow': {
          '0%, 100%': { textShadow: '0 0 5px #00ffff, 0 0 10px #00ffff, 0 0 15px #00ffff' },
          '50%': { textShadow: '0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 30px #00ffff' }
        },
        'zoom-in': {
          '0%': { transform: 'scale(0.8) rotateY(-15deg)', opacity: '0', filter: 'blur(4px)' },
          '50%': { transform: 'scale(0.9) rotateY(0deg)', opacity: '0.7', filter: 'blur(2px)' },
          '100%': { transform: 'scale(1) rotateY(0deg)', opacity: '1', filter: 'blur(0px)' }
        },
        'zoom-out': {
          '0%': { transform: 'scale(1.2)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        'slide-up': {
          '0%': { transform: 'translateY(100px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'slide-down': {
          '0%': { transform: 'translateY(-100px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'fade-in-scale': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { transform: 'scale(1.05)', opacity: '0.8' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        'text-reveal': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' }
        },
        'pulse-glow': {
          '0%, 100%': { 
            boxShadow: '0 0 5px rgba(16, 185, 129, 0.5), 0 0 20px rgba(16, 185, 129, 0.3), 0 0 35px rgba(16, 185, 129, 0.1)' 
          },
          '50%': { 
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.8), 0 0 35px rgba(16, 185, 129, 0.6), 0 0 50px rgba(16, 185, 129, 0.4)' 
          }
        },
        'morph': {
          '0%, 100%': { borderRadius: '60% 40% 30% 70%/60% 30% 70% 40%' },
          '50%': { borderRadius: '30% 60% 70% 40%/50% 60% 30% 60%' }
        },
        'float-gentle': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-10px) rotate(1deg)' }
        },
        'rotate-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        },
        'bounce-slow': {
          '0%, 100%': { 
            transform: 'translateY(-25%)',
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)'
          },
          '50%': {
            transform: 'translateY(0)',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)'
          }
        }
      },
      animation: {
        'pulse': 'pulse 1.5s ease-in-out infinite',
        'slideIn': 'slideIn 0.5s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s infinite',
        'gradient': 'gradient 3s ease infinite',
        'float-box': 'float-box 20s ease-in-out infinite',
        'box-float': 'box-float 15s ease-in-out infinite',
        'slide': 'slide 20s linear infinite',
        'matrix-rain': 'matrix-rain 3s linear infinite',
        'cyber-glow': 'cyber-glow 2s ease-in-out infinite',
        'zoom-in': 'zoom-in 1.2s ease-out forwards',
        'zoom-out': 'zoom-out 0.8s ease-out forwards',
        'slide-up': 'slide-up 0.8s ease-out forwards',
        'slide-down': 'slide-down 0.8s ease-out forwards',
        'fade-in-scale': 'fade-in-scale 1s ease-out forwards',
        'text-reveal': 'text-reveal 0.8s ease-out forwards',
        'gradient-shift': 'gradient-shift 3s ease infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'morph': 'morph 8s ease-in-out infinite',
        'float-gentle': 'float-gentle 4s ease-in-out infinite',
        'rotate-slow': 'rotate-slow 20s linear infinite',
        'bounce-slow': 'bounce-slow 3s infinite'
      },
      // Screens configuration aligned with centralized breakpoint system
      // These breakpoints are sourced from src/lib/breakpoints.js for consistency
      screens: {
        'xs': '375px',    // Extra small mobile devices
        'sm': '640px',    // Small devices (matches Tailwind default)
        'md': '768px',    // Tablet start (matches TABLET_MIN_WIDTH)
        'lg': '1024px',   // Desktop start (matches DESKTOP_MIN_WIDTH)
        'xl': '1280px',   // Large desktop (matches LARGE_DESKTOP_MIN)
        '2xl': '1536px',  // Extra large desktop (matches EXTRA_LARGE_DESKTOP_MIN)
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-mesh': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'ai-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)',
        'emerald-gradient': 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
        'cyan-gradient': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%)',
        'luxury-gradient': 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
        'neon-gradient': 'linear-gradient(135deg, #10b981 0%, #06b6d4 25%, #8b5cf6 50%, #d946ef 75%, #f59e0b 100%)',
        'dark-gradient': 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #2d2d2d 100%)',
        'holographic': 'linear-gradient(45deg, #ff0080 0%, #ff8c00 25%, #40e0d0 50%, #ff0080 75%, #ff8c00 100%)',
        'aurora': 'linear-gradient(135deg, #00c9ff 0%, #92fe9d 25%, #92fe9d 50%, #00c9ff 75%, #92fe9d 100%)',
        'sunset': 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)',
        'electric': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'matrix': 'linear-gradient(0deg, transparent 0%, rgba(0, 255, 65, 0.1) 50%, transparent 100%)'
      },
      backdropBlur: {
        xs: '2px',
      },
      backgroundSize: {
        '300%': '300%',
        '400%': '400%',
        '500%': '500%',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
        '128': '32rem',
        '144': '36rem',
      },
      fontSize: {
        '10xl': ['10rem', { lineHeight: '1' }],
        '11xl': ['12rem', { lineHeight: '1' }],
        '12xl': ['14rem', { lineHeight: '1' }],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem',
      },
      boxShadow: {
        'neon': '0 0 5px currentColor, 0 0 20px currentColor, 0 0 35px currentColor, 0 0 50px currentColor',
        'glow-sm': '0 0 10px rgba(16, 185, 129, 0.5)',
        'glow-md': '0 0 20px rgba(16, 185, 129, 0.5)',
        'glow-lg': '0 0 30px rgba(16, 185, 129, 0.5)',
        'glow-xl': '0 0 40px rgba(16, 185, 129, 0.5)',
        'inner-glow': 'inset 0 0 20px rgba(16, 185, 129, 0.3)',
      },
      dropShadow: {
        'glow': '0 0 10px rgba(16, 185, 129, 0.8)',
        'neon': '0 0 20px currentColor',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      }
    },
  },
  plugins: [],
}

