import React, { useState } from 'react';
import { Square, Circle, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@editor/components/ui';
import type { Collider2DComponent } from '@engine/components/Collider2DComponent';

interface ColliderInspectorProps {
  collider: Collider2DComponent | null;
}

export const ColliderInspector: React.FC<ColliderInspectorProps> = ({
  collider,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!collider) return null;

  const shape = collider.shape;
  const shapeType = shape.type;

  return (
    <div className="bg-zinc-950/50 rounded border border-zinc-800">
      {/* Header */}
      <button
        className="flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-zinc-800"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown size={12} className="text-zinc-500" />
        ) : (
          <ChevronRight size={12} className="text-zinc-500" />
        )}
        <Square size={12} className="text-yellow-400" />
        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
          Collider 2D
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-2 pb-2 space-y-2">
          {/* Shape display */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-zinc-500 w-12">Shape</label>
            <div className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-zinc-900 text-zinc-300">
              {shapeType === 'box' && <Square size={10} />}
              {shapeType === 'circle' && <Circle size={10} />}
              <span className="capitalize">{shapeType}</span>
            </div>
          </div>

          {/* Box dimensions */}
          {shapeType === 'box' && (
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-zinc-500 w-12">Size</label>
              <div className="flex-1 grid grid-cols-2 gap-1">
                <div className="relative">
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">
                    W
                  </span>
                  <Input
                    type="number"
                    value={shape.width}
                    readOnly
                    className="h-6 text-[11px] pl-5"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">
                    H
                  </span>
                  <Input
                    type="number"
                    value={shape.height}
                    readOnly
                    className="h-6 text-[11px] pl-5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Circle radius */}
          {shapeType === 'circle' && (
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-zinc-500 w-12">Radius</label>
              <Input
                type="number"
                value={shape.radius}
                readOnly
                className="flex-1 h-6 text-[11px]"
              />
            </div>
          )}

          {/* Offset */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-zinc-500 w-12">Offset</label>
            <div className="flex-1 grid grid-cols-2 gap-1">
              <div className="relative">
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">
                  X
                </span>
                <Input
                  type="number"
                  value={collider.offset[0]}
                  readOnly
                  className="h-6 text-[11px] pl-5"
                />
              </div>
              <div className="relative">
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">
                  Y
                </span>
                <Input
                  type="number"
                  value={collider.offset[1]}
                  readOnly
                  className="h-6 text-[11px] pl-5"
                />
              </div>
            </div>
          </div>

          {/* Is Trigger */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-zinc-500 w-12">Trigger</label>
            <input
              type="checkbox"
              checked={collider.isTrigger}
              readOnly
              className="w-4 h-4 rounded bg-zinc-950 border-zinc-700"
            />
            <span className="text-[10px] text-zinc-500">
              {collider.isTrigger ? 'No physics response' : 'Physical collision'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
