'use client'

import type { ReactNode } from 'react'
import { motion } from 'motion/react'

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      duration: 0.2,
      staggerChildren: 0.06,
      delayChildren: 0.02,
    },
  },
}

export const feedItemVariants = {
  hidden: { opacity: 0, y: 16, filter: 'blur(3px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      type: 'spring' as const,
      stiffness: 260,
      damping: 28,
    },
  },
}

interface AnimatedFeedContainerProps {
  children: ReactNode
  className?: string
}

export function AnimatedFeedContainer({ children, className }: AnimatedFeedContainerProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  )
}
