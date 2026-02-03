'use client';

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { Hold, HOLD_COLORS, HOLD_BORDER_WIDTH, Comment } from '@/lib/types';
import { CommentsSection } from '@/components/route/CommentsSection';

interface RouteViewerProps {
  wallImageUrl: string;
  holds: Hold[];
  routeName: string;
  grade?: string;
  setterName?: string;
  routeId?: string;
  comments?: Comment[];
}

export function RouteViewer({ wallImageUrl, holds, routeName, grade, setterName, routeId, comments = [] }: RouteViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Get hold type label
  const getHoldLabel = (type: Hold['type']) => {
    switch (type) {
      case 'start': return 'S';
      case 'finish': return 'F';
      default: return null;
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Main content area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* Wall image with holds */}
        <div
          ref={containerRef}
          className="relative w-full h-full flex items-center justify-center"
        >
          <Image
            src={wallImageUrl}
            alt="Climbing wall"
            width={1920}
            height={1080}
            className="select-none object-contain"
            style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }}
            priority
            draggable={false}
            onLoad={(e) => {
              const img = e.target as HTMLImageElement;
              setDimensions({ width: img.clientWidth, height: img.clientHeight });
            }}
          />

          {/* Render holds */}
          {dimensions.width > 0 && (
            <div
              className="absolute pointer-events-none"
              style={{
                width: dimensions.width,
                height: dimensions.height,
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              {holds.map((hold) => {
                const left = (hold.x / 100) * dimensions.width;
                const top = (hold.y / 100) * dimensions.height;
                const size = hold.size === 'small' ? 24 : hold.size === 'large' ? 56 : 36;
                const label = getHoldLabel(hold.type);
                const borderWidth = HOLD_BORDER_WIDTH[hold.size];

                return (
                  <div
                    key={hold.id}
                    className="absolute flex items-center justify-center"
                    style={{
                      left: left - size / 2,
                      top: top - size / 2,
                      width: size,
                      height: size,
                    }}
                  >
                    <div
                      className="w-full h-full rounded-full flex items-center justify-center"
                      style={{
                        borderWidth: `${borderWidth}px`,
                        borderStyle: 'solid',
                        borderColor: HOLD_COLORS[hold.type],
                        backgroundColor: `${HOLD_COLORS[hold.type]}40`,
                        boxShadow: `0 0 12px ${HOLD_COLORS[hold.type]}60`,
                      }}
                    >
                      {label && (
                        <span
                          className="text-sm font-bold"
                          style={{ color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
                        >
                          {label}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Gradient overlay at top for header */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />

        {/* Route info - floating on top */}
        <div className="absolute top-0 inset-x-0 p-4">
          <div className="flex items-start gap-2.5 flex-wrap">
            <div className="flex flex-col">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-xl font-bold text-white drop-shadow-lg">{routeName}</h3>
                {grade && (
                  <span className="px-2.5 py-1 rounded-full bg-primary/90 text-primary-foreground text-xs font-bold backdrop-blur-sm">
                    {grade}
                  </span>
                )}
              </div>
              {setterName && (
                <span className="text-sm text-white/60 drop-shadow">by {setterName}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Comments Section - slides up from bottom */}
      {routeId && (
        <div className="shrink-0 bg-background border-t border-border/50">
          <CommentsSection routeId={routeId} comments={comments} />
        </div>
      )}
    </div>
  );
}
