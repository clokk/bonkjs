import React, { useState } from 'react';
import { Activity, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@editor/components/ui';
import type { RigidBody2DComponent } from '@engine/components/RigidBody2DComponent';

interface RigidBodyInspectorProps {
  rigidBody: RigidBody2DComponent | null;
}

export const RigidBodyInspector: React.FC<RigidBodyInspectorProps> = ({
  rigidBody,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!rigidBody) return null;

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
        <Activity size={12} className="text-orange-400" />
        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
          Rigid Body 2D
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-2 pb-2 space-y-2">
          {/* Body Type */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-zinc-500 w-16">Body Type</label>
            <div className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-zinc-900 text-zinc-300 capitalize">
              {rigidBody.bodyType}
            </div>
          </div>

          {/* Mass */}
          {rigidBody.mass !== undefined && (
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-zinc-500 w-16">Mass</label>
              <Input
                type="number"
                value={rigidBody.mass}
                readOnly
                className="flex-1 h-6 text-[11px]"
              />
            </div>
          )}

          {/* Friction */}
          {rigidBody.friction !== undefined && (
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-zinc-500 w-16">Friction</label>
              <Input
                type="number"
                value={rigidBody.friction}
                readOnly
                step={0.01}
                className="flex-1 h-6 text-[11px]"
              />
            </div>
          )}

          {/* Restitution */}
          {rigidBody.restitution !== undefined && (
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-zinc-500 w-16">Bounce</label>
              <Input
                type="number"
                value={rigidBody.restitution}
                readOnly
                step={0.1}
                className="flex-1 h-6 text-[11px]"
              />
            </div>
          )}

          {/* Gravity Scale */}
          {rigidBody.gravityScale !== undefined && (
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-zinc-500 w-16">Gravity</label>
              <Input
                type="number"
                value={rigidBody.gravityScale}
                readOnly
                step={0.1}
                className="flex-1 h-6 text-[11px]"
              />
            </div>
          )}

          {/* Linear Damping */}
          {rigidBody.linearDamping !== undefined && (
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-zinc-500 w-16">Lin. Damp</label>
              <Input
                type="number"
                value={rigidBody.linearDamping}
                readOnly
                step={0.01}
                className="flex-1 h-6 text-[11px]"
              />
            </div>
          )}

          {/* Angular Damping */}
          {rigidBody.angularDamping !== undefined && (
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-zinc-500 w-16">Ang. Damp</label>
              <Input
                type="number"
                value={rigidBody.angularDamping}
                readOnly
                step={0.01}
                className="flex-1 h-6 text-[11px]"
              />
            </div>
          )}

          {/* Fixed Rotation */}
          {rigidBody.fixedRotation !== undefined && (
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-zinc-500 w-16">Fixed Rot</label>
              <input
                type="checkbox"
                checked={rigidBody.fixedRotation}
                readOnly
                className="w-4 h-4 rounded bg-zinc-950 border-zinc-700"
              />
              <span className="text-[10px] text-zinc-500">
                {rigidBody.fixedRotation ? 'No rotation' : 'Can rotate'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
