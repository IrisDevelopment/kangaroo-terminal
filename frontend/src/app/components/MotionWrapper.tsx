"use client";

import { MotionConfig } from 'framer-motion';
import { useSettings } from '@/context/SettingsContext';

export default function MotionWrapper({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  
  return (
    <MotionConfig reducedMotion={settings.animationsEnabled ? "never" : "always"}>
      {children}
    </MotionConfig>
  );
}
