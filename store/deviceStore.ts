import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ScannerConfig {
  scanner_mode: 'keyboard' | 'serial';
  scanner_suffix: 'enter' | 'tab' | 'none';
  scanner_min_speed_ms: number;
  scanner_prefix: string;
  scanner_serial_port_info?: string;
}

export interface ThermalConfig {
  thermal_enabled: boolean;
  thermal_connection: 'browser' | 'serial';
  thermal_serial_port_info?: string;
  thermal_paper_width: '80mm' | '58mm';
  thermal_auto_print: boolean;
  thermal_auto_cut: boolean;
  thermal_baud_rate: number;
}

export interface A4Config {
  a4_enabled: boolean;
  a4_auto_print: boolean;
  a4_default_copies: number;
}

export interface DeviceStoreState {
  scanner: ScannerConfig;
  thermal: ThermalConfig;
  a4: A4Config;

  updateScanner: (config: Partial<ScannerConfig>) => void;
  updateThermal: (config: Partial<ThermalConfig>) => void;
  updateA4: (config: Partial<A4Config>) => void;
  resetAll: () => void;
}

const DEFAULT_STATE = {
  scanner: {
    scanner_mode: 'keyboard' as const,
    scanner_suffix: 'enter' as const,
    scanner_min_speed_ms: 50,
    scanner_prefix: '',
  },
  thermal: {
    thermal_enabled: false,
    thermal_connection: 'browser' as const,
    thermal_paper_width: '80mm' as const,
    thermal_auto_print: false,
    thermal_auto_cut: true,
    thermal_baud_rate: 9600,
  },
  a4: {
    a4_enabled: false,
    a4_auto_print: false,
    a4_default_copies: 1,
  }
};

export const useDeviceStore = create<DeviceStoreState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      updateScanner: (config) => set((state) => ({ scanner: { ...state.scanner, ...config } })),
      updateThermal: (config) => set((state) => ({ thermal: { ...state.thermal, ...config } })),
      updateA4: (config) => set((state) => ({ a4: { ...state.a4, ...config } })),
      resetAll: () => set(DEFAULT_STATE),
    }),
    { name: 'bill-dale-devices' }
  )
);
