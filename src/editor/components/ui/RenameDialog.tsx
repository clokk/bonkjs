import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@editor/lib/utils';

interface RenameDialogProps {
  isOpen: boolean;
  initialValue: string;
  title?: string;
  onClose: () => void;
  onConfirm: (newValue: string) => void;
}

export const RenameDialog: React.FC<RenameDialogProps> = ({
  isOpen,
  initialValue,
  title = 'Rename',
  onClose,
  onConfirm,
}) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset value when dialog opens with new initial value
  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      // Auto-focus with delay for stability
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onConfirm(value.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl w-80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
          <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              'w-full px-3 py-2 text-sm',
              'bg-zinc-800 border border-zinc-600 rounded',
              'text-zinc-200 placeholder-zinc-500',
              'focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
            )}
            placeholder="Enter name..."
          />

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded',
                'bg-zinc-800 text-zinc-300 hover:bg-zinc-700',
                'transition-colors'
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded',
                'bg-sky-600 text-white hover:bg-sky-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-colors'
              )}
            >
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
