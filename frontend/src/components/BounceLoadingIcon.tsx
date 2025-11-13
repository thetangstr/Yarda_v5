/**
 * Bounce Loading Icon Component
 *
 * Reusable loading animation with customizable emoji icon.
 * Features a bouncing emoji with animated pulsing dots below.
 *
 * Usage:
 * - Holiday: <BounceLoadingIcon icon="🎄" />
 * - Generation: <BounceLoadingIcon icon="📷" />
 * - Any status: <BounceLoadingIcon icon="🏠" />
 */

import React from 'react';
import { motion } from 'framer-motion';

interface BounceLoadingIconProps {
  icon?: string;
  className?: string;
}

export default function BounceLoadingIcon({
  icon = '🎄',
  className = 'text-8xl'
}: BounceLoadingIconProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      {/* Bouncing Icon Animation */}
      <motion.div
        animate={{
          y: [0, -20, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: 'easeInOut',
        }}
        className={`${className} drop-shadow-2xl`}
        style={{
          filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.8))',
        }}
      >
        {icon}
      </motion.div>

      {/* Animated Pulsing Dots */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0 }}
          className="w-3 h-3 bg-white rounded-full"
        />
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
          className="w-3 h-3 bg-white rounded-full"
        />
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
          className="w-3 h-3 bg-white rounded-full"
        />
      </div>
    </div>
  );
}
