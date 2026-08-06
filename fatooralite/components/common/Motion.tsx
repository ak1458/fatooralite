"use client";
import React from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";

interface TransitionProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/** Standard fade in animation wrapper */
export function FadeIn({ children, className, style }: TransitionProps) {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/** Reusable slide up transition */
export function SlideUp({ children, className, style }: TransitionProps) {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} // Custom ease
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/** Fade & scale transition for Modals */
export function ModalAnimate({ children, className, style }: TransitionProps) {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={shouldReduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/** Slide-over from right/left for drawers (like AssistantDock) */
export function SlideOver({ children, className, style, side = "right" }: TransitionProps & { side?: "left" | "right" }) {
  const shouldReduceMotion = useReducedMotion();
  const offset = side === "right" ? 100 : -100;
  
  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: `${offset}%` }}
      animate={{ opacity: 1, x: 0 }}
      exit={shouldReduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: `${offset}%` }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/** Stagger list entrance */
export function StaggerList({ children, className, style }: TransitionProps) {
  const shouldReduceMotion = useReducedMotion();

  const listVariants = {
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
    hidden: { opacity: 0 },
  };

  const itemVariants = {
    visible: { opacity: 1, y: 0 },
    hidden: { opacity: 0, y: 10 },
  };

  if (shouldReduceMotion) {
    return <div className={className} style={style}>{children}</div>;
  }

  // Helper to map children to animated motion.div elements
  const animatedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return (
        <motion.div variants={itemVariants} transition={{ duration: 0.25, ease: "easeOut" }}>
          {child}
        </motion.div>
      );
    }
    return child;
  });

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={listVariants}
      className={className}
      style={style}
    >
      {animatedChildren}
    </motion.div>
  );
}

export { AnimatePresence };
