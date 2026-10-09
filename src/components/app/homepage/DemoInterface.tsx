"use client";
import { motion } from "framer-motion";
import useIntl from "@/hooks/useIntl";

export const DemoInterface = () => {
  const { t } = useIntl();

  return (
    <motion.div
      className="relative w-full max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.8 }}
    >
      {/* Browser-like frame */}
      <div className="bg-gray-950 rounded-2xl shadow-2xl overflow-hidden border border-gray-800">
        {/* Browser header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 border-b border-gray-800">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-600" />
            <div className="w-3 h-3 rounded-full bg-gray-600" />
            <div className="w-3 h-3 rounded-full bg-gray-600" />
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-gray-800 rounded-lg px-4 py-1.5 text-gray-400 text-sm text-center">
              plaart.app/editor
            </div>
          </div>
        </div>

        {/* Editor preview */}
        <div className="relative h-80 bg-black flex">
          {/* Left toolbar mock */}
          <div className="w-14 bg-gray-900/50 border-r border-gray-800 flex flex-col items-center py-4 gap-3">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + i * 0.1 }}
              >
                <div className="w-4 h-4 rounded bg-gray-700" />
              </motion.div>
            ))}
          </div>

          {/* Canvas area */}
          <div className="flex-1 relative overflow-hidden">
            {/* Grid background */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />

            {/* Animated drawing elements */}
            <motion.div
              className="absolute top-1/4 left-1/4 w-32 h-32 rounded-xl bg-white/5 border border-white/10"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.5 }}
            />

            <motion.div
              className="absolute top-1/3 right-1/4 w-24 h-24 rounded-full bg-white/5 border border-white/10"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.5 }}
            />

            <motion.div
              className="absolute bottom-1/4 left-1/3 w-40 h-20 rounded-lg bg-white/5 border border-white/10"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.6, duration: 0.5 }}
            />

            {/* AI cursor animation */}
            <motion.div
              className="absolute w-4 h-4"
              initial={{ x: 100, y: 100 }}
              animate={{
                x: [100, 200, 150, 250],
                y: [100, 150, 200, 120],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
              }}
            >
              <div className="w-4 h-4 bg-white rounded-full shadow-lg shadow-white/20" />
              <motion.div
                className="absolute -top-8 left-4 bg-gray-800 px-2 py-1 rounded text-xs text-white whitespace-nowrap"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                AI Drawing
              </motion.div>
            </motion.div>

            {/* Center text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.8 }}
              >
                <p className="text-gray-400 text-sm">
                  {t("home.hero.content.canvas.data.title")}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  {t("home.hero.content.canvas.data.subtitle")}
                </p>
              </motion.div>
            </div>
          </div>

          {/* Right panel mock */}
          <div className="w-48 bg-gray-900/50 border-l border-gray-800 p-3">
            <motion.div
              className="text-xs text-gray-500 mb-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
            >
              Layers
            </motion.div>
            {["Background", "Shape 1", "Shape 2", "Shape 3"].map((layer, i) => (
              <motion.div
                key={layer}
                className="flex items-center gap-2 px-2 py-1.5 rounded bg-gray-800/50 mb-1 text-xs text-gray-400"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.6 + i * 0.1 }}
              >
                <div className="w-3 h-3 rounded bg-gray-700" />
                {layer}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Glow effect - subtle gray */}
      <div className="absolute -inset-4 bg-gradient-to-r from-gray-500/5 via-gray-400/5 to-gray-500/5 rounded-3xl blur-3xl -z-10" />
    </motion.div>
  );
};
