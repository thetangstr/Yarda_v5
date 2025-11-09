/**
 * Camera Animation Component
 *
 * Displays an animated camera icon during generation to provide visual feedback.
 * Animation runs for approximately 15 seconds as requested.
 *
 * Features:
 * - Bouncing camera icon with rotation
 * - Smooth continuous animation
 * - Represents the "photo capture" process
 */

import React from 'react';
import { motion } from 'framer-motion';

interface CameraAnimationProps {
  /** Custom CSS classes */
  className?: string;
}

export const CameraAnimation: React.FC<CameraAnimationProps> = ({ className = '' }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Animated camera icon */}
      <motion.div
        animate={{
          y: [0, -20, 0], // Bounce up and down
          rotate: [0, -10, 10, -10, 0], // Slight rotation
          scale: [1, 1.1, 1], // Slight scale pulse
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative"
      >
        {/* Camera SVG */}
        <svg
          className="w-24 h-24 text-brand-green"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>

        {/* Shutter flash effect */}
        <motion.div
          animate={{
            opacity: [0, 1, 0],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatDelay: 0.5,
          }}
          className="absolute inset-0 bg-yellow-400 rounded-full blur-xl opacity-30"
        />
      </motion.div>

      {/* Animated rings */}
      <motion.div
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.3, 0, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute inset-0 border-4 border-brand-green rounded-full"
        style={{ width: '120px', height: '120px' }}
      />

      <motion.div
        animate={{
          scale: [1, 1.8, 1],
          opacity: [0.2, 0, 0.2],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.5,
        }}
        className="absolute inset-0 border-4 border-blue-500 rounded-full"
        style={{ width: '120px', height: '120px' }}
      />
    </div>
  );
};

export default CameraAnimation;
