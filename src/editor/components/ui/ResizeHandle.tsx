import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@editor/lib/utils';

interface ResizeHandleProps {
  orientation: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
  onDoubleClick?: () => void;
  className?: string;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  orientation,
  onResize,
  onDoubleClick,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const delta = orientation === 'vertical' ? e.movementX : e.movementY;
      onResize(delta);
    },
    [isDragging, orientation, onResize]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor =
        orientation === 'vertical' ? 'col-resize' : 'row-resize';
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp, orientation]);

  return (
    <div
      className={cn(
        orientation === 'vertical'
          ? 'w-1 h-full cursor-col-resize'
          : 'h-1 w-full cursor-row-resize',
        'hover:bg-blue-500/50 active:bg-blue-500 transition-colors z-50 flex-shrink-0',
        isDragging ? 'bg-blue-500' : 'bg-transparent',
        className
      )}
      onMouseDown={handleMouseDown}
      onDoubleClick={onDoubleClick}
    />
  );
};
