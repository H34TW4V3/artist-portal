import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
            'fade-in-up': {
                '0%': { opacity: '0', transform: 'translateY(20px) scale(0.98)' },
                '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
            },
             'fade-in': { // Simple fade-in
                 '0%': { opacity: '0' },
                 '100%': { opacity: '1' },
             },
            'fade-out': { // Added fade-out keyframes
                 '0%': { opacity: '1' },
                 '100%': { opacity: '0', visibility: 'hidden' }, // Hide element after fade
            },
            'subtle-pulse': {
                '0%, 100%': { transform: 'scale(1)', opacity: 0.7 }, // Added opacity change
                '50%': { transform: 'scale(1.05)', opacity: 1 }, // Increased scale and full opacity
            },
            'float': { // Added float keyframes
                '0%, 100%': { transform: 'translateY(0) translateX(0)' },
                '50%': { transform: 'translateY(-5px) translateX(2px)' },
            },
            'fall': { // Added fall keyframes
                '0%': { transform: 'translateY(-10vh) translateX(0)', opacity: '1' },
                '100%': { transform: 'translateY(100vh) translateX(5px)', opacity: '0' },
            },
            'sway-fall': { // Added sway-fall keyframes
                '0%': { transform: 'translateY(-10vh) translateX(0) rotate(0deg)', opacity: '1' },
                '50%': { transform: 'translateY(50vh) translateX(15px) rotate(10deg)', opacity: '0.8' },
                '100%': { transform: 'translateY(100vh) translateX(-10px) rotate(-5deg)', opacity: '0' },
            },
            'progress-indeterminate': { // Indeterminate progress animation
                '0%': { transform: 'translateX(-100%) scaleX(0.5)' },
                '50%': { transform: 'translateX(0) scaleX(0.5)' },
                '100%': { transform: 'translateX(100%) scaleX(0.5)' },
             },
            'slide-in-from-right': { // Step slide animation
              '0%': { transform: 'translateX(100%)', opacity: '0' },
              '100%': { transform: 'translateX(0)', opacity: '1' },
            },
            'slide-out-to-left': { // Step slide animation
              '0%': { transform: 'translateX(0)', opacity: '1' },
              '100%': { transform: 'translateX(-100%)', opacity: '0' },
            },
            'slide-in-from-left': { // Step slide animation
              '0%': { transform: 'translateX(-100%)', opacity: '0' },
              '100%': { transform: 'translateX(0)', opacity: '1' },
            },
            'slide-out-to-right': { // Step slide animation
              '0%': { transform: 'translateX(0)', opacity: '1' },
              '100%': { transform: 'translateX(100%)', opacity: '0' },
            },
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
            'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
             'fade-in': 'fade-in 0.5s ease-out forwards', // Simple fade-in
            'fade-out': 'fade-out 0.5s ease-in-out forwards', // Added fade-out animation
            'subtle-pulse': 'subtle-pulse 2.5s ease-in-out infinite',
            'float': 'float 6s ease-in-out infinite', // Added float animation
            'fall': 'fall 1.5s linear infinite', // Added fall animation
            'sway-fall': 'sway-fall 3s ease-in-out infinite', // Added sway-fall animation
            'progress-indeterminate': 'progress-indeterminate 1.5s ease-in-out infinite', // Added indeterminate progress animation
             // Added step slide animations
             'slide-in-from-right': 'slide-in-from-right 0.4s ease-out', // Slower slide
             'slide-out-to-left': 'slide-out-to-left 0.4s ease-out forwards',
             'slide-in-from-left': 'slide-in-from-left 0.4s ease-out',
             'slide-out-to-right': 'slide-out-to-right 0.4s ease-out forwards',
  		},
         // Add animation delay utility
         animationDelay: {
             '100': '100ms',
             '200': '200ms',
             '300': '300ms',
             '500': '500ms',
         },
  	}
  },
  plugins: [
      require("tailwindcss-animate"),
      function ({ addUtilities }: { addUtilities: Function }) {
          const newUtilities = {
              '.animation-delay-100': { 'animation-delay': '100ms' },
              '.animation-delay-200': { 'animation-delay': '200ms' },
              '.animation-delay-300': { 'animation-delay': '300ms' },
              '.animation-delay-500': { 'animation-delay': '500ms' },
          }
          addUtilities(newUtilities)
      }
  ],
} satisfies Config;
