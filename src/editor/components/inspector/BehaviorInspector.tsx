import React, { useState } from 'react';
import { Code, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@editor/components/ui';
import type { Behavior } from '@engine/Behavior';

interface BehaviorInspectorProps {
  behaviors: readonly Behavior[];
}

const BASE_BEHAVIOR_PROPS = new Set([
  'gameObject',
  'enabled',
  'events',
  'transform',
  'scheduler',
  'coroutines',
  'rigidbody',
  'deltaTime',
  'fixedDeltaTime',
  'timeScale',
  'mousePosition',
]);

function getCustomProps(behavior: Behavior): [string, unknown][] {
  const entries: [string, unknown][] = [];

  for (const key of Object.keys(behavior)) {
    if (key.startsWith('_')) continue;
    if (BASE_BEHAVIOR_PROPS.has(key)) continue;

    const value = (behavior as unknown as Record<string, unknown>)[key];

    if (typeof value === 'function') continue;
    if (value === undefined) continue;

    entries.push([key, value]);
  }

  return entries;
}

function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export const BehaviorInspector: React.FC<BehaviorInspectorProps> = ({
  behaviors,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (behaviors.length === 0) return null;

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
        <Code size={12} className="text-sky-400" />
        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
          Behaviors
        </span>
        <span className="text-[10px] text-zinc-500 ml-auto">
          {behaviors.length}
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-2 pb-2 space-y-2">
          {behaviors.map((behavior, index) => {
            const behaviorName = behavior.constructor.name;
            const customProps = getCustomProps(behavior);

            return (
              <div
                key={index}
                className="bg-zinc-900 rounded border border-zinc-700 p-2"
              >
                {/* Behavior header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-sky-400">
                    {behaviorName}
                  </span>
                  <span className="text-[9px] text-zinc-500">
                    {behavior.enabled ? 'enabled' : 'disabled'}
                  </span>
                </div>

                {/* Behavior props */}
                {customProps.length > 0 ? (
                  <div className="space-y-1">
                    {customProps.map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <label className="text-[10px] text-zinc-500 w-16 truncate capitalize">
                          {key}
                        </label>
                        <Input
                          type={typeof value === 'number' ? 'number' : 'text'}
                          value={formatValue(value)}
                          readOnly
                          className="flex-1 h-5 text-[10px]"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-500 italic">
                    No custom properties
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
