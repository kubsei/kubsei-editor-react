import React, { useState } from "react";
import styles from "./AiFancyLoader.module.css";
import AiChatModal from "./AiChatModal";

type FancyLoaderProps = {
  size?: number;
  speed?: number;
  className?: string;
};

const AiFancyLoader = ({
  size = 1,
  speed = 2,
  className = "",
}: FancyLoaderProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleClick = () => {
    setIsChatOpen(true);
  };

  return (
    <>
      <div
        className={`${className} ${styles.container}`}
        style={
          {
            "--size": size,
            "--time-animation": `${speed}s`,
            "--mouse-x": `${mousePosition.x}px`,
            "--mouse-y": `${mousePosition.y}px`,
          } as React.CSSProperties
        }
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseMove={handleMouseMove}
        onClick={handleClick}>
        {/* Ambient light effect */}
        {isHovered && <div className={styles.ambientLight} />}

        {/* Main loader */}
        <div
          className={`${styles.loader} ${isHovered ? styles.loaderHover : ""}`}>
          <svg
            className={styles.svg}
            width="100"
            height="100"
            viewBox="0 0 100 100">
            <defs>
              <mask id="clipping">
                <polygon points="0,0 100,0 100,100 0,100" fill="black" />
                <polygon points="25,25 75,25 50,75" fill="white" />
                <polygon points="50,25 75,75 25,75" fill="white" />
                <polygon points="35,35 65,35 50,65" fill="white" />
                <polygon points="35,35 65,35 50,65" fill="white" />
                <polygon points="35,35 65,35 50,65" fill="white" />
                <polygon points="35,35 65,35 50,65" fill="white" />
              </mask>
            </defs>
          </svg>

          <div className={styles.box} />
        </div>

        {/* Glow effect on hover */}
        {isHovered && <div className={styles.glowEffect} />}
      </div>

      {/* Chat Modal */}
      <AiChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
};

export default AiFancyLoader;
