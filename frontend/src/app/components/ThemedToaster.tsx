"use client";

import { Toaster } from 'sonner';
import { useSettings } from '@/context/SettingsContext';

export default function ThemedToaster() {
  const { settings } = useSettings();
  const isLight = settings.theme === 'light';

  return (
    <Toaster
      position="bottom-right"
      theme={isLight ? "light" : "dark"}
      toastOptions={{
        style: isLight ? {
          background: '#FAF6F1',
          border: '1px solid rgba(139, 90, 43, 0.3)',
          color: '#3D2B1F',
          boxShadow: '0 4px 20px rgba(61, 43, 31, 0.15)',
          borderRadius: '12px',
          padding: '16px',
          fontSize: '13px'
        } : {
          background: '#0F0B08',
          border: '1px solid rgba(198, 142, 86, 0.4)',
          color: '#EBE3DB',
          boxShadow: '0 0 25px rgba(198, 142, 86, 0.15), 0 4px 10px rgba(0,0,0,0.5)',
          borderRadius: '12px',
          padding: '16px',
          fontSize: '13px'
        },
        className: 'font-sans'
      }}
    />
  );
}
