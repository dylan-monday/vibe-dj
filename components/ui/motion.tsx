"use client";

import { motion } from "framer-motion";
import { forwardRef, type ComponentProps } from "react";

// Spring config for snappy feel
export const springConfig = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

// Soft spring for slower animations
export const softSpring = {
  type: "spring" as const,
  stiffness: 200,
  damping: 25,
};

// Fade in animation
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

// Scale up animation
export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: springConfig,
};

// Slide up animation
export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: springConfig,
};

// Motion div with common animations
export const MotionDiv = motion.div;

// Motion button with tap animation
export const MotionButton = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof motion.button>
>((props, ref) => (
  <motion.button
    ref={ref}
    whileTap={{ scale: 0.97 }}
    transition={springConfig}
    {...props}
  />
));
MotionButton.displayName = "MotionButton";
