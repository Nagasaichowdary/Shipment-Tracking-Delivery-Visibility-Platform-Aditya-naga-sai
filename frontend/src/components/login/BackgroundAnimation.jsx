/**
 * BackgroundAnimation.jsx
 * ─────────────────────────────────────────────────────────────
 * Premium animated world map background for the brand section.
 * Uses a simplified abstract dotted map representation and animated
 * shipping/flight routes to convey a global logistics scale.
 */

import React from 'react';

// Abstract coordinates for dots to form a stylized world map
const MAP_DOTS = [
  // North America
  [15,30],[18,28],[20,32],[22,29],[25,31],[28,27],[16,35],[19,37],[23,36],[27,34],[21,40],[25,39],[28,42],
  // South America
  [29,50],[32,48],[35,52],[31,56],[34,55],[37,58],[33,62],[36,61],[35,67],[38,65],[37,72],
  // Europe
  [45,25],[48,23],[51,26],[46,29],[49,28],[52,31],[47,34],[50,33],[53,36],
  // Africa
  [48,40],[52,39],[56,42],[49,46],[53,45],[57,48],[51,52],[55,51],[58,54],[53,58],[57,57],[56,63],
  // Asia
  [60,25],[64,23],[68,26],[72,24],[61,30],[65,29],[69,32],[73,31],[77,29],[63,35],[67,34],[71,37],[75,36],[79,34],
  [65,40],[69,39],[73,42],[77,41],[81,39],[70,45],[74,44],[78,47],
  // Oceania
  [75,55],[79,53],[83,56],[76,60],[80,59],[84,62],[78,66],[82,65]
];

// Major logistics hubs (x, y)
const HUBS = [
  { id: 'nyc',  x: 23, y: 36 },
  { id: 'lon',  x: 47, y: 29 },
  { id: 'dxb',  x: 60, y: 40 },
  { id: 'hkg',  x: 73, y: 42 },
  { id: 'syd',  x: 82, y: 65 },
  { id: 'gru',  x: 35, y: 61 },
];

// Routes connecting hubs
const ROUTES = [
  { from: 'nyc', to: 'lon', ctrlX: 35, ctrlY: 25 },
  { from: 'lon', to: 'dxb', ctrlX: 53, ctrlY: 30 },
  { from: 'dxb', to: 'hkg', ctrlX: 66, ctrlY: 38 },
  { from: 'hkg', to: 'syd', ctrlX: 80, ctrlY: 53 },
  { from: 'nyc', to: 'gru', ctrlX: 22, ctrlY: 48 },
  { from: 'lon', to: 'gru', ctrlX: 38, ctrlY: 45 },
];

const BackgroundAnimation = () => {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        opacity: 0.6,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#c7d2fe" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      {/* Global Glow */}
      <rect width="100" height="100" fill="url(#mapGlow)" />

      {/* Abstract Map Dots */}
      <g opacity="0.3">
        {MAP_DOTS.map(([x, y], i) => (
          <circle key={i} cx={`${x}%`} cy={`${y}%`} r="0.4" fill="#64748b" />
        ))}
      </g>

      {/* Shipping Routes (Curved Paths) */}
      {ROUTES.map((route, i) => {
        const fromHub = HUBS.find(h => h.id === route.from);
        const toHub = HUBS.find(h => h.id === route.to);
        const pathData = `M ${fromHub.x} ${fromHub.y} Q ${route.ctrlX} ${route.ctrlY} ${toHub.x} ${toHub.y}`;
        
        return (
          <g key={i}>
            <path
              d={pathData}
              fill="none"
              stroke="rgba(99, 102, 241, 0.2)"
              strokeWidth="0.3"
              strokeDasharray="1 1"
            />
            {/* Animated plane/cargo blip */}
            <circle r="0.6" fill="#818cf8">
              <animateMotion
                dur={`${4 + i}s`}
                repeatCount="indefinite"
                path={pathData}
                keyPoints="0;1"
                keyTimes="0;1"
                calcMode="linear"
              />
              <animate attributeName="opacity" values="0;1;0" dur={`${4 + i}s`} repeatCount="indefinite" />
            </circle>
          </g>
        );
      })}

      {/* Hub Nodes */}
      {HUBS.map((hub, i) => (
        <g key={hub.id}>
          <circle cx={`${hub.x}%`} cy={`${hub.y}%`} r="1" fill="#4f46e5" opacity="0.8" />
          <circle cx={`${hub.x}%`} cy={`${hub.y}%`} r="3" fill="#6366f1" opacity="0.4">
            <animate attributeName="r" values="1;4;1" dur={`${2 + i % 2}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0;0.6" dur={`${2 + i % 2}s`} repeatCount="indefinite" />
          </circle>
        </g>
      ))}

      {/* Floating logistics particles (representing active shipments globally) */}
      {Array.from({ length: 20 }).map((_, i) => (
        <circle key={`p${i}`} cx={`${10 + (i * 17) % 80}%`} cy={`${10 + (i * 23) % 80}%`} r="0.3" fill="#c7d2fe">
          <animate attributeName="opacity" values="0;0.8;0" dur={`${3 + i % 4}s`} repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="translate" values="0,0; 0,-3; 0,0" dur={`${4 + i % 3}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
};

export default BackgroundAnimation;
