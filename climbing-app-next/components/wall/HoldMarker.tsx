'use client';

import { Hold, HOLD_SIZES } from '@/lib/types';

interface HoldMarkerProps {
  hold: Hold;
  containerWidth: number;
  containerHeight: number;
  showSequence: boolean;
}

export function HoldMarker({
  hold,
  containerWidth,
  containerHeight,
  showSequence,
}: HoldMarkerProps) {
  // Convert percentage to pixels
  const x = (hold.x / 100) * containerWidth;
  const y = (hold.y / 100) * containerHeight;

  // Get size in pixels (percentage of container width)
  const sizePercent = parseFloat(HOLD_SIZES[hold.size]);
  const size = (sizePercent / 100) * containerWidth;
  const radius = size / 2;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${x - radius}px`,
        top: `${y - radius}px`,
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      {/* Hold circle */}
      <div
        className="w-full h-full rounded-full border-4 transition-all"
        style={{
          borderColor: hold.color,
          backgroundColor: `${hold.color}20`, // 20% opacity
        }}
      />

      {/* Sequence number */}
      {showSequence && hold.sequence !== null && (
        <div
          className="absolute inset-0 flex items-center justify-center text-white font-bold pointer-events-none"
          style={{
            fontSize: `${size * 0.4}px`,
            textShadow: '0 0 4px rgba(0,0,0,0.8)',
          }}
        >
          {hold.sequence}
        </div>
      )}
    </div>
  );
}
