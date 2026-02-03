import React, { useState } from 'react';
import { Image, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@editor/components/ui';
import type { SpriteComponent } from '@engine/components/SpriteComponent';

interface SpriteInspectorProps {
  sprite: SpriteComponent | null;
}

export const SpriteInspector: React.FC<SpriteInspectorProps> = ({ sprite }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!sprite) return null;

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
        <Image size={12} className="text-green-400" />
        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
          Sprite
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-2 pb-2 space-y-2">
          {/* Source */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-zinc-500 w-12">Source</label>
            <Input
              value={sprite.src || '(none)'}
              readOnly
              className="flex-1 h-6 text-[11px]"
            />
          </div>

          {/* Anchor */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-zinc-500 w-12">Anchor</label>
            <div className="flex-1 grid grid-cols-2 gap-1">
              <div className="relative">
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">
                  X
                </span>
                <Input
                  type="number"
                  value={sprite.anchor[0]}
                  readOnly
                  step={0.1}
                  className="h-6 text-[11px] pl-5"
                />
              </div>
              <div className="relative">
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">
                  Y
                </span>
                <Input
                  type="number"
                  value={sprite.anchor[1]}
                  readOnly
                  step={0.1}
                  className="h-6 text-[11px] pl-5"
                />
              </div>
            </div>
          </div>

          {/* Tint */}
          {sprite.tint && (
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-zinc-500 w-12">Tint</label>
              <div className="flex items-center gap-1 flex-1">
                <div
                  className="w-6 h-6 rounded border border-zinc-700"
                  style={{ backgroundColor: sprite.tint }}
                />
                <Input
                  value={sprite.tint}
                  readOnly
                  className="flex-1 h-6 text-[11px]"
                />
              </div>
            </div>
          )}

          {/* Alpha */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-zinc-500 w-12">Alpha</label>
            <Input
              type="number"
              value={sprite.alpha}
              readOnly
              step={0.1}
              className="flex-1 h-6 text-[11px]"
            />
          </div>

          {/* Flip */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-zinc-500 w-12">Flip</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-[10px] text-zinc-400">
                <input
                  type="checkbox"
                  checked={sprite.flipX}
                  readOnly
                  className="w-3 h-3 rounded bg-zinc-950 border-zinc-700"
                />
                X
              </label>
              <label className="flex items-center gap-1 text-[10px] text-zinc-400">
                <input
                  type="checkbox"
                  checked={sprite.flipY}
                  readOnly
                  className="w-3 h-3 rounded bg-zinc-950 border-zinc-700"
                />
                Y
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
