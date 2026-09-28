"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  motion,
  AnimatePresence,
  useInView,
  useSpring,
  useTransform,
  useMotionValue,
  HTMLMotionProps,
} from "framer-motion";

/**
 * Standard CineSpace cinematic easing curve:
 * [0.16, 1, 0.3, 1] — snappy start with elegant decelerating cinematic glide.
 */
export const CINEMATIC_EASE = [0.16, 1, 0.3, 1] as const;

export interface FadeInProps extends HTMLMotionProps<"div"> {
  direction?: "up" | "down" | "left" | "right" | "none";
  delay?: number;
  duration?: number;
  distance?: number;
  once?: boolean;
}

export function FadeIn({
  children,
  direction = "up",
  delay = 0,
  duration = 0.65,
  distance = 24,
  once = true,
  className = "",
  ...props
}: FadeInProps) {
  const getInitialOffset = () => {
    switch (direction) {
      case "up":
        return { y: distance, x: 0 };
      case "down":
        return { y: -distance, x: 0 };
      case "left":
        return { x: distance, y: 0 };
      case "right":
        return { x: -distance, y: 0 };
      default:
        return { x: 0, y: 0 };
    }
  };

  const offset = getInitialOffset();

  return (
    <motion.div
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, margin: "-40px" }}
      transition={{
        duration,
        delay,
        ease: CINEMATIC_EASE,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export interface StaggerContainerProps extends HTMLMotionProps<"div"> {
  staggerDelay?: number;
  initialDelay?: number;
  once?: boolean;
}

export function StaggerContainer({
  children,
  staggerDelay = 0.08,
  initialDelay = 0.05,
  once = true,
  className = "",
  ...props
}: StaggerContainerProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-40px" }}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: initialDelay,
          },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export interface StaggerItemProps extends HTMLMotionProps<"div"> {
  yOffset?: number;
  duration?: number;
}

export function StaggerItem({
  children,
  yOffset = 20,
  duration = 0.55,
  className = "",
  ...props
}: StaggerItemProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: yOffset },
        show: {
          opacity: 1,
          y: 0,
          transition: {
            duration,
            ease: CINEMATIC_EASE,
          },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export interface ScrollRevealProps extends HTMLMotionProps<"div"> {
  delay?: number;
  duration?: number;
  yOffset?: number;
  scale?: number;
}

export function ScrollReveal({
  children,
  delay = 0,
  duration = 0.7,
  yOffset = 30,
  scale = 0.98,
  className = "",
  ...props
}: ScrollRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset, scale }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration,
        delay,
        ease: CINEMATIC_EASE,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export interface AnimatedCounterProps {
  to: number;
  from?: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function AnimatedCounter({
  to,
  from = 0,
  duration = 1.6,
  className = "",
  prefix = "",
  suffix = "",
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [displayValue, setDisplayValue] = useState(from);

  useEffect(() => {
    if (!inView) return;

    let startTime: number | null = null;
    let frameId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      // Ease out expo: 1 - 2^(-10 * progress)
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(from + (to - from) * easeProgress);
      setDisplayValue(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [inView, from, to, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}

export interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  tiltIntensity?: number;
  glareIntensity?: number;
  className?: string;
}

export function TiltCard({
  children,
  tiltIntensity = 7,
  glareIntensity = 0.25,
  className = "",
  ...props
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setCoords({ x, y });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setCoords({ x: 0, y: 0 });
  };

  const rotateY = coords.x * tiltIntensity * 2;
  const rotateX = -coords.y * tiltIntensity * 2;

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative perspective-1000 transition-transform duration-200 ease-out ${className}`}
      style={{
        transform: isHovered
          ? `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`
          : "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
      }}
      {...props}
    >
      {children}
      {isHovered && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${(coords.x + 0.5) * 100}% ${(coords.y + 0.5) * 100}%, rgba(255, 255, 255, ${glareIntensity}) 0%, transparent 60%)`,
          }}
        />
      )}
    </div>
  );
}

export { motion, AnimatePresence, useSpring, useTransform, useMotionValue };
