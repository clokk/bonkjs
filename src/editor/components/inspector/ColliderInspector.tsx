import React, { useState, useCallback } from 'react';
import { Square, Circle, ChevronDown, ChevronRight } from 'lucide-react';
import {
  EditableNumberInput,
  EditableCheckbox,
  EditableVector2Input,
} from './EditableInputs';
import { usePropertyChange } from '@editor/hooks/usePropertyChange';
import type { Collider2DComponent } from '@engine/components/Collider2DComponent';
import { CollisionLayers } from '@engine/physics/CollisionLayers';

interface ColliderInspectorProps {
  collider: Collider2DComponent | null;
}

export const ColliderInspector: React.FC<ColliderInspectorProps> = ({
  collider,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const markDirty = usePropertyChange();

  const handleWidthChange = useCallback(
    (value: number) => {
      if (!collider || collider.shape.type !== 'box') return;
      collider.shape.width = value;
      markDirty();
    },
    [collider, markDirty]
  );

  const handleHeightChange = useCallback(
    (value: number) => {
      if (!collider || collider.shape.type !== 'box') return;
      collider.shape.height = value;
      markDirty();
    },
    [collider, markDirty]
  );

  const handleRadiusChange = useCallback(
    (value: number) => {
      if (!collider || collider.shape.type !== 'circle') return;
      collider.shape.radius = value;
      markDirty();
    },
    [collider, markDirty]
  );

  const handleOffsetChange = useCallback(
    (values: [number, number]) => {
      if (!collider) return;
      collider.offset = values;
      markDirty();
    },
    [collider, markDirty]
  );

  const handleIsTriggerChange = useCallback(
    (checked: boolean) => {
      if (!collider) return;
      collider.isTrigger = checked;
      markDirty();
    },
    [collider, markDirty]
  );

  const handleLayerChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (!collider) return;
      collider.layer = e.target.value === 'default' ? undefined : e.target.value;
      markDirty();
    },
    [collider, markDirty]
  );

  const handleMaskToggle = useCallback(
    (layerName: string, checked: boolean) => {
      if (!collider) return;
      const allLayers = CollisionLayers.getLayerNames();
      const currentMask = collider.mask ?? [];

      if (checked) {
        const newMask = [...currentMask, layerName];
        // If all layers are now selected, clear mask (= collide with all)
        collider.mask = newMask.length >= allLayers.length ? undefined : newMask;
      } else {
        const newMask = currentMask.length === 0
          ? allLayers.filter((n) => n !== layerName)
          : currentMask.filter((n) => n !== layerName);
        collider.mask = newMask.length === 0 ? undefined : newMask;
      }
      markDirty();
    },
    [collider, markDirty]
  );

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
          {/* Shape display (read-only - changing shape type would be complex) */}
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
                  <EditableNumberInput
                    value={shape.width}
                    onChange={handleWidthChange}
                    min={1}
                    className="h-6 text-[11px] pl-5"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">
                    H
                  </span>
                  <EditableNumberInput
                    value={shape.height}
                    onChange={handleHeightChange}
                    min={1}
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
              <EditableNumberInput
                value={shape.radius}
                onChange={handleRadiusChange}
                min={1}
                className="flex-1 h-6 text-[11px]"
              />
            </div>
          )}

          {/* Offset */}
          <EditableVector2Input
            label="Offset"
            values={collider.offset as [number, number]}
            onChange={handleOffsetChange}
          />

          {/* Is Trigger */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-zinc-500 w-12">Trigger</label>
            <EditableCheckbox
              checked={collider.isTrigger}
              onChange={handleIsTriggerChange}
            />
            <span className="text-[10px] text-zinc-500">
              {collider.isTrigger ? 'No physics response' : 'Physical collision'}
            </span>
          </div>

          {/* Collision Layer */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-zinc-500 w-12">Layer</label>
            <select
              value={collider.layer || 'default'}
              onChange={handleLayerChange}
              className="flex-1 h-6 text-[11px] bg-zinc-900 text-zinc-300 border border-zinc-700 rounded px-1.5 outline-none focus:border-sky-500"
            >
              {CollisionLayers.getLayerNames().map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Collision Mask */}
          <div className="flex gap-2">
            <label className="text-[10px] text-zinc-500 w-12 pt-0.5">
              Collides
            </label>
            <div className="flex-1 flex flex-wrap gap-x-3 gap-y-1">
              {CollisionLayers.getLayerNames().map((name) => (
                <label
                  key={name}
                  className="flex items-center gap-1 text-[10px] text-zinc-400 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={
                      !collider.mask ||
                      collider.mask.length === 0 ||
                      collider.mask.includes(name)
                    }
                    onChange={(e) => handleMaskToggle(name, e.target.checked)}
                    className="w-3 h-3 accent-sky-500"
                  />
                  {name}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
