import React from 'react';
import { EditorLayout } from '@editor/components/layout/EditorLayout';
import { useKeyboardShortcuts } from '@editor/hooks/useKeyboardShortcuts';

export const App: React.FC = () => {
  useKeyboardShortcuts();

  return <EditorLayout />;
};
