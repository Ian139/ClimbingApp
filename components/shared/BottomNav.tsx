'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useTransitionStore } from '@/lib/stores/transition-store';
import { MouseEvent } from 'react';

const navItems = [
  {
    href: '/',
    label: 'Home',
    color: 'hsl(var(--primary))',
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    href: '/editor',
    label: 'Create',
    color: 'hsl(var(--primary))',
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const startTransition = useTransitionStore((state) => state.startTransition);

  const handleNavClick = (e: MouseEvent<HTMLAnchorElement>, href: string, color: string) => {
    // Don't animate if already on this page
    if (pathname === href) return;

    e.preventDefault();

    // Get click position
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    // Start the liquid transition
    startTransition(x, y, color);

    // Navigate after a short delay to let animation start
    setTimeout(() => {
      router.push(href);
    }, 100);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Glass effect background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t border-border/50" />

      <div className="relative flex items-center justify-evenly px-6 py-2 pb-safe">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href, item.color)}
              className={cn(
                'relative flex flex-col items-center justify-center py-2 px-6 min-w-[72px]',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {/* Animated background pill */}
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={{
                    type: 'spring',
                    stiffness: 350,
                    damping: 30,
                  }}
                />
              )}
              <motion.div
                animate={{
                  scale: isActive ? 1.05 : 1,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 20,
                }}
                className="relative z-10"
              >
                {item.icon(isActive)}
              </motion.div>
              <motion.span
                animate={{
                  opacity: isActive ? 1 : 0.7,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 20,
                }}
                className={cn(
                  'relative z-10 text-xs mt-1 font-medium',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {item.label}
              </motion.span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
