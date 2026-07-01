import { forwardRef } from 'react';
import type { ArrowGeom } from './types';

interface Props {
  arrows: ArrowGeom[];
  width: number;
  height: number;
  left: number;
}

/** Flechas SVG de dependencia. El padre le aplica clip-path según el scroll horizontal
 * para que nunca se dibujen por detrás de la columna sticky de títulos. */
export const GanttArrows = forwardRef<SVGSVGElement, Props>(({ arrows, width, height, left }, ref) => {
  if (!arrows.length) return null;
  return (
    <svg ref={ref} className="g-arrows" width={width} height={height}
      style={{ position: 'absolute', top: 0, left, zIndex: 2, pointerEvents: 'none' }}>
      <defs>
        <marker id="g-ah" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#8C92A0" />
        </marker>
        <marker id="g-ah-w" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#BE1409" />
        </marker>
      </defs>
      {arrows.map((a) => (
        <path key={a.key} fill="none" markerEnd={`url(#${a.conflict ? 'g-ah-w' : 'g-ah'})`}
          d={`M ${a.x1} ${a.y1} C ${a.x1 + 16} ${a.y1}, ${a.x2 - 16} ${a.y2}, ${a.x2} ${a.y2}`}
          stroke={a.conflict ? '#BE1409' : '#8C92A0'} strokeWidth={a.conflict ? 1.6 : 1.3}
          strokeDasharray={a.conflict ? '4 3' : 'none'} opacity={a.conflict ? 0.95 : 0.65} />
      ))}
    </svg>
  );
});
GanttArrows.displayName = 'GanttArrows';
