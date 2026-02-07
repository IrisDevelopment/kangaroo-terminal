"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Trash2, Sun, Moon, Eye, EyeOff, MessageSquare, Sparkles, RefreshCw } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { toast } from 'sonner';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/* toggle switch component */
const ToggleSwitch = ({ 
  enabled, 
  onChange, 
  label, 
  description 
}: { 
  enabled: boolean; 
  onChange: (value: boolean) => void; 
  label: string;
  description?: string;
}) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex-1 mr-4">
      <p className="text-sm text-white font-medium font-mono">{label}</p>
      {description && <p className="text-xs text-gray-500 mt-0.5 font-mono">{description}</p>}
    </div>
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
        enabled 
          ? 'bg-primary/80 border border-primary' 
          : 'bg-white/10 border border-white/20'
      }`}
    >
      <div 
        className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200 ${
          enabled 
            ? 'left-5 bg-white shadow-lg' 
            : 'left-0.5 bg-gray-400'
        }`}
      />
    </button>
  </div>
);

/* refresh rate options */
const REFRESH_RATES = [
  { label: '3s', value: 3000 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
  { label: '30s', value: 30000 },
];

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSetting, resetTutorials, clearCache } = useSettings();

  const handleResetTutorials = () => {
    resetTutorials();
    toast.success('Tutorials reset! They will show again on page visits.');
  };

  const handleClearCache = () => {
    clearCache();
    toast.success('Application cache cleared.');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center p-4"
          >
            {/* modal */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="luxury-modal w-full max-w-md relative overflow-hidden max-h-[85vh] overflow-y-auto"
            >
              {/* close button */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 luxury-icon-button z-10"
              >
                <X size={20} />
              </button>

              {/* header */}
              <div className="mb-6">
                <h2 className="text-xl font-medium text-white font-mono">Settings</h2>
                <p className="text-sm text-gray-400 font-mono">Customise your terminal experience.</p>
              </div>

              {/* roo section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-medium text-primary uppercase tracking-wider font-mono">Roo Assistant</h3>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <ToggleSwitch
                    enabled={settings.rooEnabled}
                    onChange={(value) => updateSetting('rooEnabled', value)}
                    label="Show Roo"
                    description="Toggle the kangaroo mascot"
                  />
                  <div className="border-t border-white/5" />
                  <ToggleSwitch
                    enabled={settings.speechBubblesEnabled}
                    onChange={(value) => updateSetting('speechBubblesEnabled', value)}
                    label="Tutorial Bubbles"
                    description="Show help bubbles when visiting new pages"
                  />
                  <div className="border-t border-white/5" />
                  <div className="flex items-center justify-between py-3">
                    <div className="flex-1 mr-4">
                      <p className="text-sm text-white font-medium font-mono">Reset Tutorials</p>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono">Show all tutorial messages again</p>
                    </div>
                    <button
                      onClick={handleResetTutorials}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium font-mono bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:border-primary/50 hover:bg-primary/10 transition-all"
                    >
                      <RotateCcw size={12} className="inline mr-1.5" />
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              {/* interface section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-medium text-primary uppercase tracking-wider font-mono">Interface</h3>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                  {/* theme toggle */}
                  <div className="flex items-center justify-between py-3">
                    <div className="flex-1 mr-4">
                      <p className="text-sm text-white font-medium font-mono">Theme</p>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono">Switch between light and dark mode</p>
                    </div>
                    <div className="flex gap-1 p-1 bg-white/5 rounded-lg border border-white/5">
                      <button
                        onClick={() => updateSetting('theme', 'dark')}
                        className={`p-2 rounded-md transition-all ${
                          settings.theme === 'dark'
                            ? 'bg-primary text-white shadow-lg'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <Moon size={14} />
                      </button>
                      <button
                        onClick={() => updateSetting('theme', 'light')}
                        className={`p-2 rounded-md transition-all ${
                          settings.theme === 'light'
                            ? 'bg-primary text-white shadow-lg'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <Sun size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="border-t border-white/5" />
                  <ToggleSwitch
                    enabled={settings.animationsEnabled}
                    onChange={(value) => updateSetting('animationsEnabled', value)}
                    label="Animations"
                    description="Enable motion effects and transitions"
                  />
                </div>
              </div>

              {/* data section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-medium text-primary uppercase tracking-wider font-mono">Data & Cache</h3>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                  {/* refresh rate */}
                  <div className="py-3">
                    <div className="flex-1 mb-3">
                      <p className="text-sm text-white font-medium font-mono">Scraper Refresh Rate</p>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono">How often to check scraper status</p>
                    </div>
                    <div className="flex gap-2">
                      {REFRESH_RATES.map(({ label, value }) => (
                        <button
                          key={value}
                          onClick={() => updateSetting('scraperRefreshRate', value)}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium font-mono transition-all ${
                            settings.scraperRefreshRate === value
                              ? 'bg-primary text-white shadow-lg'
                              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-white/5" />
                  <ToggleSwitch
                    enabled={settings.chartEventsEnabled}
                    onChange={(value) => updateSetting('chartEventsEnabled', value)}
                    label="Chart Event Markers"
                    description="Show volatile price move events on stock charts"
                  />
                  <div className="border-t border-white/5" />
                  {/* clear cache */}
                  <div className="flex items-center justify-between py-3">
                    <div className="flex-1 mr-4">
                      <p className="text-sm text-white font-medium font-mono">Clear Cache</p>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono">Remove cached stock data and preferences</p>
                    </div>
                    <button
                      onClick={handleClearCache}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium font-mono bg-danger/10 border border-danger/30 text-danger hover:bg-danger/20 transition-all"
                    >
                      <Trash2 size={12} className="inline mr-1.5" />
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {/* footer */}
              <div className="text-center text-xs text-gray-600 pt-2 font-mono">
                Settings are saved automatically
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
