import React, { useState, useEffect } from 'react';
import { Input } from '@engine/Input';

interface InputState {
  horizontal: number;
  vertical: number;
  horizontalRaw: number;
  verticalRaw: number;
  jump: boolean;
  jumpDown: boolean;
  fire: boolean;
  fireDown: boolean;
  mouseX: number;
  mouseY: number;
  mouseLeft: boolean;
  mouseRight: boolean;
  wasd: string;
  arrows: string;
}

export const InputDebugOverlay: React.FC = () => {
  const [inputState, setInputState] = useState<InputState>({
    horizontal: 0,
    vertical: 0,
    horizontalRaw: 0,
    verticalRaw: 0,
    jump: false,
    jumpDown: false,
    fire: false,
    fireDown: false,
    mouseX: 0,
    mouseY: 0,
    mouseLeft: false,
    mouseRight: false,
    wasd: '----',
    arrows: '----',
  });

  useEffect(() => {
    let animationFrameId: number;

    const updateInputState = () => {
      const newState: InputState = {
        horizontal: Input.getAxis('horizontal'),
        vertical: Input.getAxis('vertical'),
        horizontalRaw: Input.getAxisRaw('horizontal'),
        verticalRaw: Input.getAxisRaw('vertical'),
        jump: Input.getButton('jump'),
        jumpDown: Input.getButtonDown('jump'),
        fire: Input.getButton('fire'),
        fireDown: Input.getButtonDown('fire'),
        mouseX: Input.mousePosition[0],
        mouseY: Input.mousePosition[1],
        mouseLeft: Input.getMouseButton(0),
        mouseRight: Input.getMouseButton(2),
        wasd: `${Input.getKey('KeyW') ? 'W' : '-'}${Input.getKey('KeyA') ? 'A' : '-'}${Input.getKey('KeyS') ? 'S' : '-'}${Input.getKey('KeyD') ? 'D' : '-'}`,
        arrows: `${Input.getKey('ArrowUp') ? '^' : '-'}${Input.getKey('ArrowLeft') ? '<' : '-'}${Input.getKey('ArrowDown') ? 'v' : '-'}${Input.getKey('ArrowRight') ? '>' : '-'}`,
      };
      setInputState(newState);
      animationFrameId = requestAnimationFrame(updateInputState);
    };

    animationFrameId = requestAnimationFrame(updateInputState);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const formatAxis = (value: number): string => {
    return value.toFixed(2).padStart(6);
  };

  const formatAxisBar = (value: number): string => {
    const normalized = Math.round((value + 1) * 5); // 0-10
    return '='.repeat(normalized) + '|' + '='.repeat(10 - normalized);
  };

  return (
    <div className="absolute top-12 right-2 bg-zinc-900/95 text-green-400 font-mono text-[11px] p-3 rounded-lg border border-zinc-700 shadow-xl backdrop-blur-sm pointer-events-none min-w-[220px] z-40">
      <div className="text-zinc-200 font-bold mb-2 pb-1 border-b border-zinc-700">
        INPUT DEBUG
      </div>

      <div className="text-zinc-500 mt-2 text-[10px]">AXES (smoothed)</div>
      <div className="flex justify-between">
        <span className="text-zinc-400">Horizontal:</span>
        <span>[{formatAxisBar(inputState.horizontal)}] {formatAxis(inputState.horizontal)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-zinc-400">Vertical:</span>
        <span>[{formatAxisBar(inputState.vertical)}] {formatAxis(inputState.vertical)}</span>
      </div>

      <div className="text-zinc-500 mt-2 text-[10px]">AXES (raw)</div>
      <div className="flex justify-between">
        <span className="text-zinc-400">Horizontal:</span>
        <span>{inputState.horizontalRaw.toString().padStart(2)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-zinc-400">Vertical:</span>
        <span>{inputState.verticalRaw.toString().padStart(2)}</span>
      </div>

      <div className="text-zinc-500 mt-2 text-[10px]">BUTTONS</div>
      <div className="flex justify-between">
        <span className="text-zinc-400">Jump (Space):</span>
        <span className={inputState.jumpDown ? 'text-yellow-400' : inputState.jump ? 'text-green-400' : 'text-zinc-600'}>
          {inputState.jumpDown ? 'DOWN!' : inputState.jump ? 'HELD' : '----'}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-zinc-400">Fire (X/LMB):</span>
        <span className={inputState.fireDown ? 'text-yellow-400' : inputState.fire ? 'text-green-400' : 'text-zinc-600'}>
          {inputState.fireDown ? 'DOWN!' : inputState.fire ? 'HELD' : '----'}
        </span>
      </div>

      <div className="text-zinc-500 mt-2 text-[10px]">MOUSE</div>
      <div className="flex justify-between">
        <span className="text-zinc-400">Position:</span>
        <span>{inputState.mouseX.toFixed(0)}, {inputState.mouseY.toFixed(0)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-zinc-400">Left:</span>
        <span className={inputState.mouseLeft ? 'text-green-400' : 'text-zinc-600'}>
          {inputState.mouseLeft ? 'HELD' : '----'}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-zinc-400">Right:</span>
        <span className={inputState.mouseRight ? 'text-green-400' : 'text-zinc-600'}>
          {inputState.mouseRight ? 'HELD' : '----'}
        </span>
      </div>

      <div className="text-zinc-500 mt-2 text-[10px]">RAW KEYS</div>
      <div className="flex justify-between">
        <span className="text-zinc-400">WASD:</span>
        <span>{inputState.wasd}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-zinc-400">Arrows:</span>
        <span>{inputState.arrows}</span>
      </div>
    </div>
  );
};
