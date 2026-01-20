'use client';

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { Hold, HOLD_COLORS } from '@/lib/types';

interface RouteViewerProps {
  wallImageUrl: string;
  holds: Hold[];
  routeName: string;
  grade?: string;
  setterName?: string;
}

export function RouteViewer({ wallImageUrl, holds, routeName, grade, setterName }: RouteViewerProps) {
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
    <div className="relative w-full h-full flex flex-col bg-zinc-950">
      {/* Route info header */}
      <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <h3 className="font-semibold text-white truncate">{routeName}</h3>
            {grade && (
              <span className="shrink-0 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                {grade}
              </span>
            )}
          </div>
          {setterName && (
            <span className="text-xs text-zinc-400 shrink-0">by {setterName}</span>
          )}
        </div>
        <div className="flex items-center gap-4 mt-2.5 text-xs text-zinc-400 overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="size-2.5 rounded-full" style={{ backgroundColor: HOLD_COLORS.start }} />
            <span>Start</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="size-2.5 rounded-full" style={{ backgroundColor: HOLD_COLORS.hand }} />
            <span>Hand</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="size-2.5 rounded-full" style={{ backgroundColor: HOLD_COLORS.foot }} />
            <span>Foot</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="size-2.5 rounded-full" style={{ backgroundColor: HOLD_COLORS.finish }} />
            <span>Finish</span>
          </div>
        </div>
      </div>

      {/* Wall with holds - fits the entire image in view */}
      <div className="flex-1 relative bg-zinc-950 flex items-center justify-center overflow-hidden">
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
              // Get the actual rendered dimensions of the image
              const img = e.target as HTMLImageElement;
              setDimensions({ width: img.clientWidth, height: img.clientHeight });
            }}
          />

          {/* Render holds - positioned relative to the image */}
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
                const size = hold.size === 'small' ? 28 : hold.size === 'large' ? 44 : 36;
                const label = getHoldLabel(hold.type);

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
                      className="w-full h-full rounded-full border-[3px] flex items-center justify-center shadow-lg"
                      style={{
                        borderColor: HOLD_COLORS[hold.type],
                        backgroundColor: `${HOLD_COLORS[hold.type]}40`,
                      }}
                    >
                      {label && (
                        <span
                          className="text-sm font-bold drop-shadow-md"
                          style={{ color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
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
      </div>

      {/* Bottom info */}
      <div className="px-4 py-2.5 bg-zinc-900 border-t border-zinc-800 text-center shrink-0">
        <p className="text-xs text-zinc-400 font-medium">{holds.length} holds total</p>
      </div>
    </div>
  );
}
