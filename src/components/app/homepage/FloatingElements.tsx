"use client";
import useIntl from "@/hooks/useIntl";
import { motion } from "framer-motion";
import { useState, useSyncExternalStore } from "react";

const generatePositions = () =>
  [...Array(8)].map(() => ({
    left: Math.random() * 100,
    top: Math.random() * 100,
    xOffset: Math.random() * 20 - 10,
    duration: 4 + Math.random() * 2,
  }));

const noSubscribe = () => () => {};

const FloatingElements = () => {
  const getColorClass = (index: number): string => {
    const colors = ["bg-gray-300", "bg-gray-400", "bg-gray-500"];
    return colors[index % 3];
  };

  const { t } = useIntl();
  const indicators = [
    t("home.hero.content.learning.indicator1"),
    t("home.hero.content.learning.indicator2"),
    t("home.hero.content.learning.indicator3"),
    t("home.hero.content.learning.indicator4"),
    t("home.hero.content.learning.indicator5"),
  ];

  // Random positions only in the browser: the server render must not depend on them (hydration)
  const isClient = useSyncExternalStore(noSubscribe, () => true, () => false);
  const [positions] = useState(generatePositions);
  const randomPositions = isClient ? positions : [];
  return (
    <div>
      <>
        {randomPositions.map((pos, i) => (
          <motion.div
            key={i}
            className={`absolute w-3 h-3 rounded-full opacity-20 ${getColorClass(
              i
            )}`}
            style={{
              left: `${pos.left}%`,
              top: `${pos.top}%`,
            }}
            animate={{
              y: [0, -40, 0],
              x: [0, pos.xOffset, 0],
              opacity: [0.1, 0.4, 0.1],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: pos.duration,
              repeat: Infinity,
              delay: i * 0.7,
              ease: "easeInOut",
            }}
          />
        ))}
      </>
      <>
        {indicators.map((text, i) => (
          <motion.div
            key={`learn-${i}`}
            className="absolute text-xs text-gray-400 font-medium"
            style={{
              left: `${20 + i * 30}%`,
              top: `${60 + i * 10}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              y: [0, -20, -40],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 1.5,
              ease: "easeOut",
            }}>
            {text}
          </motion.div>
        ))}
      </>
    </div>
  );
};

export default FloatingElements;
