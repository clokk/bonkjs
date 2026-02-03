import React, { useState } from 'react';
import { Camera, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@editor/components/ui';
import type { Camera2DComponent } from '@engine/components/Camera2DComponent';

interface CameraInspectorProps {
  camera: Camera2DComponent | null;
}

export const CameraInspector: React.FC<CameraInspectorProps> = ({ camera }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!camera) return null;

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
        <Camera size={12} className="text-purple-400" />
        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
          Camera 2D
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-2 pb-2 space-y-2">
          {/* Is Main */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-zinc-500 w-16">Is Main</label>
            <input
              type="checkbox"
              checked={camera.isMain}
              readOnly
              className="w-4 h-4 rounded bg-zinc-950 border-zinc-700"
            />
            <span className="text-[10px] text-zinc-500">
              {camera.isMain ? 'Active camera' : 'Inactive'}
            </span>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-zinc-500 w-16">Zoom</label>
            <Input
              type="number"
              value={camera.zoom}
              readOnly
              step={0.1}
              className="flex-1 h-6 text-[11px]"
            />
          </div>

          {/* Target */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-zinc-500 w-16">Target</label>
            <Input
              value={camera.target || '(none)'}
              readOnly
              className="flex-1 h-6 text-[11px]"
            />
          </div>

          {/* Follow Smoothing */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-zinc-500 w-16">Smoothing</label>
            <Input
              type="number"
              value={camera.followSmoothing}
              readOnly
              step={0.5}
              className="flex-1 h-6 text-[11px]"
            />
          </div>

          {/* Offset */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-zinc-500 w-16">Offset</label>
            <div className="flex-1 grid grid-cols-2 gap-1">
              <div className="relative">
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">
                  X
                </span>
                <Input
                  type="number"
                  value={camera.offset[0]}
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
                  value={camera.offset[1]}
                  readOnly
                  className="h-6 text-[11px] pl-5"
                />
              </div>
            </div>
          </div>

          {/* Bounds */}
          {camera.bounds && (
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500">Bounds</label>
              <div className="grid grid-cols-2 gap-1">
                <div className="relative">
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500">
                    minX
                  </span>
                  <Input
                    type="number"
                    value={camera.bounds.minX}
                    readOnly
                    className="h-6 text-[10px] pl-8"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500">
                    maxX
                  </span>
                  <Input
                    type="number"
                    value={camera.bounds.maxX}
                    readOnly
                    className="h-6 text-[10px] pl-8"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500">
                    minY
                  </span>
                  <Input
                    type="number"
                    value={camera.bounds.minY}
                    readOnly
                    className="h-6 text-[10px] pl-8"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500">
                    maxY
                  </span>
                  <Input
                    type="number"
                    value={camera.bounds.maxY}
                    readOnly
                    className="h-6 text-[10px] pl-8"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
