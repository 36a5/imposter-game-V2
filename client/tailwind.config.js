/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Syne'", "sans-serif"],
        body: ["'DM Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease forwards",
        "slide-up": "slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pop": "pop 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "reveal": "reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-ring": "pulseRing 1.5s ease infinite",
        "float": "float 3s ease-in-out infinite",
        "timer-shrink": "timerShrink linear forwards",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: "translateY(24px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        pop: { from: { transform: "scale(0.8)", opacity: 0 }, to: { transform: "scale(1)", opacity: 1 } },
        reveal: { from: { transform: "scale(0.6) rotate(-8deg)", opacity: 0 }, to: { transform: "scale(1) rotate(0deg)", opacity: 1 } },
        pulseRing: { "0%, 100%": { transform: "scale(1)", opacity: 0.5 }, "50%": { transform: "scale(1.15)", opacity: 1 } },
        float: { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        timerShrink: { from: { width: "100%" }, to: { width: "0%" } },
      },
    },
  },
  plugins: [],
};
