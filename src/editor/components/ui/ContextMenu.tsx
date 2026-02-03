import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@editor/lib/utils';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}

export interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  items,
  position,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Use capture phase to catch clicks before they propagate
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to keep menu in viewport
  useEffect(() => {
    if (!menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = position.x;
    let adjustedY = position.y;

    if (rect.right > viewportWidth) {
      adjustedX = viewportWidth - rect.width - 8;
    }
    if (rect.bottom > viewportHeight) {
      adjustedY = viewportHeight - rect.height - 8;
    }

    menu.style.left = `${adjustedX}px`;
    menu.style.top = `${adjustedY}px`;
  }, [position]);

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[160px] bg-zinc-900 border border-zinc-700 rounded-md shadow-lg py-1"
      style={{ left: position.x, top: position.y }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors',
            item.disabled
              ? 'text-zinc-600 cursor-not-allowed'
              : item.danger
                ? 'text-red-400 hover:bg-red-400/10'
                : 'text-zinc-300 hover:bg-zinc-800'
          )}
          disabled={item.disabled}
          onClick={() => {
            if (!item.disabled) {
              item.onClick();
              onClose();
            }
          }}
        >
          {item.icon && <span className="w-4 flex-shrink-0">{item.icon}</span>}
          <span className="flex-1">{item.label}</span>
          {item.shortcut && (
            <span className="text-zinc-500 text-[10px] ml-4">{item.shortcut}</span>
          )}
        </button>
      ))}
    </div>,
    document.body
  );
};
