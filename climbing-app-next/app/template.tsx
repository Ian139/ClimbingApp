'use client';

import { motion } from 'motion/react';
import { usePathname } from 'next/navigation';

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEditorPage = pathname === '/editor';

  return (
    <motion.div
      key={pathname}
      initial={{
        opacity: 0,
        scale: isEditorPage ? 1 : 0.95,
      }}
      animate={{
        opacity: 1,
        scale: 1,
      }}
      transition={{
        opacity: { duration: 0.25, delay: 0.15 },
        scale: {
          type: 'spring',
          stiffness: 300,
          damping: 25,
          delay: 0.1,
        },
      }}
      className="flex-1 flex flex-col min-h-dvh"
    >
      {children}
    </motion.div>
  );
}
