import React, { useEffect } from 'react';
import { EditorLayout } from '@editor/components/layout/EditorLayout';

export const App: React.FC = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+R (Mac) or Ctrl+R (Windows/Linux) to refresh
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        window.location.reload();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return <EditorLayout />;
};
