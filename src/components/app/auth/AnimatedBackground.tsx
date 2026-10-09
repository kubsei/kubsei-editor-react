"use client";
import { useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";

// Helper function to generate random values (called outside render)
const generateFloatingElements = () =>
  [...Array(15)].map((_, i) => ({
    width: Math.random() * 80 + 30,
    height: Math.random() * 80 + 30,
    left: Math.random() * 100,
    top: Math.random() * 100,
    xOffset: Math.random() * 30 - 15,
    duration: 6 + Math.random() * 4,
    opacity: Math.random() * 0.1 + 0.03,
  }));

const generateGridLines = () =>
  [...Array(20)].map(() => ({
    left: Math.random() * 100,
    height: Math.random() * 30 + 10,
    delay: Math.random() * 2,
    duration: 8 + Math.random() * 4,
  }));

const generateParticles = () =>
  [...Array(6)].map(() => ({
    left: 50 + Math.random() * 150,
    top: 50 + Math.random() * 150,
    duration: 3 + Math.random() * 2,
  }));

const noSubscribe = () => () => {};

// Componente de fondo animado moderno
export const AnimatedBackground = ({ type = "login" }) => {
  const isLogin = type === "login";

  // Use useState with initializer function to generate values once
  const [floatingElements] = useState(generateFloatingElements);
  const [gridLines] = useState(generateGridLines);
  const [particles] = useState(generateParticles);
  // Random shapes only in the browser: server and client would generate different values (hydration)
  const isClient = useSyncExternalStore(noSubscribe, () => true, () => false);

  return (
    <div className="min-h-screen relative w-full bg-black overflow-hidden">
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Floating geometric shapes */}
      <div className="absolute inset-0">
        {isClient && floatingElements.map((element, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-white/10"
            style={{
              width: `${element.width}px`,
              height: `${element.height}px`,
              left: `${element.left}%`,
              top: `${element.top}%`,
              opacity: element.opacity,
            }}
            animate={{
              y: [0, -20, 0],
              x: [0, element.xOffset, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: element.duration,
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Animated vertical lines */}
      <div className="absolute inset-0">
        {isClient && gridLines.map((line, i) => (
          <motion.div
            key={i}
            className="absolute w-px bg-gradient-to-b from-transparent via-white/10 to-transparent"
            style={{
              left: `${line.left}%`,
              height: `${line.height}%`,
            }}
            animate={{
              y: ['-100%', '200%'],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: line.duration,
              repeat: Infinity,
              delay: line.delay,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Main visual element */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isLogin ? (
          // Modern geometric composition for Login
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            {/* Central circle */}
            <motion.div
              className="w-64 h-64 rounded-full border border-white/20"
              animate={{
                rotate: 360,
                scale: [1, 1.05, 1]
              }}
              transition={{
                rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
              }}
            />

            {/* Inner circle */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border border-white/30"
              animate={{
                rotate: -360,
              }}
              transition={{
                duration: 15, repeat: Infinity, ease: "linear"
              }}
            />

            {/* Core dot */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.8, 1, 0.8]
              }}
              transition={{
                duration: 2, repeat: Infinity, ease: "easeInOut"
              }}
            />

            {/* Orbiting dots */}
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-white/60"
                style={{
                  transformOrigin: '0 0',
                }}
                animate={{
                  rotate: 360,
                }}
                transition={{
                  duration: 8 + i * 2,
                  repeat: Infinity,
                  ease: "linear",
                  delay: i * 0.5,
                }}
              >
                <div
                  className="w-2 h-2 rounded-full bg-white/60"
                  style={{
                    transform: `translateX(${80 + i * 25}px)`,
                  }}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          // Modern abstract shape for Register
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            {/* Stacked rectangles */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute border border-white/20 rounded-lg"
                style={{
                  width: `${200 - i * 30}px`,
                  height: `${200 - i * 30}px`,
                  left: `${i * 15}px`,
                  top: `${i * 15}px`,
                }}
                animate={{
                  rotate: [0, 5, 0, -5, 0],
                  scale: [1, 1.02, 1],
                }}
                transition={{
                  duration: 6 + i,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut",
                }}
              />
            ))}

            {/* Central element */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20"
              style={{
                marginLeft: '35px',
                marginTop: '35px'
              }}
              animate={{
                rotate: 45,
                scale: [1, 1.1, 1],
              }}
              transition={{
                rotate: { duration: 0.5 },
                scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
              }}
            />

            {/* Floating particles */}
            {isClient && particles.map((particle, i) => (
              <motion.div
                key={`particle-${i}`}
                className="absolute w-1 h-1 rounded-full bg-white/40"
                style={{
                  left: `${particle.left}px`,
                  top: `${particle.top}px`,
                }}
                animate={{
                  y: [0, -30, 0],
                  opacity: [0.4, 0.8, 0.4],
                  scale: [1, 1.5, 1],
                }}
                transition={{
                  duration: particle.duration,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: "easeOut",
                }}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />

      {/* Corner accent */}
      <motion.div
        className="absolute top-8 right-8 text-white/20 text-sm font-light tracking-widest"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        PLAART
      </motion.div>

      {/* Designer info */}
      <motion.div
        className="absolute bottom-8 left-8 text-white"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.5 }}
      >
        <h3 className="font-medium text-sm tracking-wide">Sixtus Nosike</h3>
        <p className="text-xs text-white/40 mt-1">CEO & Founder</p>
      </motion.div>

      {/* Social link */}
      <motion.button
        className="absolute bottom-8 right-8 bg-white/5 backdrop-blur-sm text-white/60 px-4 py-2 rounded-full text-xs font-medium cursor-pointer hover:bg-white/10 hover:text-white/80 transition-all duration-300 border border-white/10"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 2, duration: 0.5 }}
      >
        Follow
      </motion.button>
    </div>
  );
};
