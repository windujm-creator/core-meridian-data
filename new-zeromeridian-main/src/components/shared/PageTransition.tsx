/**
 * PageTransition.tsx — ZERØ MERIDIAN 2026 push88
 */
import React, { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const rm = useReducedMotion();
  return (
    <motion.div
      initial={rm ? {} : { opacity:0, y:6 }}
      animate={rm ? {} : { opacity:1, y:0 }}
      exit={rm   ? {} : { opacity:0, y:-4 }}
      transition={{ duration:0.18, ease:[0.22,1,0.36,1] }}
      style={{ width:'100%' }}
    >
      {children}
    </motion.div>
  );
};

PageTransition.displayName = 'PageTransition';
export default memo(PageTransition);
