import React, { useState } from 'react';
import { Move, RotateCcw, Maximize2, Layers, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@editor/components/ui';
import type { Transform } from '@engine/Transform';

interface TransformInspectorProps {
  transform: Transform;
}

interface Vector2InputProps {
  label: string;
  icon: React.ReactNode;
  values: [number, number];
  step?: number;
}

const Vector2Input: React.FC<Vector2InputProps> = ({
  label,
  icon,
  values,
  step = 1,
}) => {
  return (
    <div className="flex items-center gap-2">
      <div className="w-5 text-zinc-500">{icon}</div>
      <div className="flex-1 grid grid-cols-2 gap-1">
        <div className="relative">
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-red-400 font-mono">
            X
          </span>
          <Input
            type="number"
            value={values[0]}
            readOnly
            step={step}
            className="h-6 text-[11px] pl-5 pr-1"
          />
        </div>
        <div className="relative">
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-green-400 font-mono">
            Y
          </span>
          <Input
            type="number"
            value={values[1]}
            readOnly
            step={step}
            className="h-6 text-[11px] pl-5 pr-1"
          />
        </div>
      </div>
    </div>
  );
};

interface NumberInputProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  step?: number;
}

const NumberInput: React.FC<NumberInputProps> = ({
  label,
  icon,
  value,
  step = 1,
}) => {
  return (
    <div className="flex items-center gap-2">
      <div className="w-5 text-zinc-500">{icon}</div>
      <Input
        type="number"
        value={value}
        readOnly
        step={step}
        className="flex-1 h-6 text-[11px]"
      />
    </div>
  );
};

export const TransformInspector: React.FC<TransformInspectorProps> = ({
  transform,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

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
        <Move size={12} className="text-sky-400" />
        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
          Transform
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-2 pb-2 space-y-2">
          <Vector2Input
            label="Position"
            icon={<Move size={12} />}
            values={transform.position as [number, number]}
          />
          <NumberInput
            label="Rotation"
            icon={<RotateCcw size={12} />}
            value={transform.rotation}
          />
          <Vector2Input
            label="Scale"
            icon={<Maximize2 size={12} />}
            values={transform.scale as [number, number]}
            step={0.1}
          />
          <NumberInput
            label="Z-Index"
            icon={<Layers size={12} />}
            value={transform.zIndex}
          />
        </div>
      )}
    </div>
  );
};
