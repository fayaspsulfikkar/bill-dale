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

export interface CashDrawerConfig {
  drawer_enabled: boolean;
  drawer_trigger: 'sale_complete' | 'manual' | 'both';
}

export interface CustomerDisplayConfig {
  display_enabled: boolean;
  display_idle_msg: string;
  display_port: string;
}

export interface DeviceStoreState {
  scanner: ScannerConfig;
  thermal: ThermalConfig;
  a4: A4Config;
  cashDrawer: CashDrawerConfig;
  customerDisplay: CustomerDisplayConfig;

  updateScanner: (config: Partial<ScannerConfig>) => void;
  updateThermal: (config: Partial<ThermalConfig>) => void;
  updateA4: (config: Partial<A4Config>) => void;
  updateCashDrawer: (config: Partial<CashDrawerConfig>) => void;
  updateCustomerDisplay: (config: Partial<CustomerDisplayConfig>) => void;
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
  },
  cashDrawer: {
    drawer_enabled: false,
    drawer_trigger: 'sale_complete' as const,
  },
  customerDisplay: {
    display_enabled: false,
    display_idle_msg: 'Welcome to our store!',
    display_port: '',
  }
};

export const useDeviceStore = create<DeviceStoreState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      updateScanner: (config) => set((state) => ({ scanner: { ...state.scanner, ...config } })),
      updateThermal: (config) => set((state) => ({ thermal: { ...state.thermal, ...config } })),
      updateA4: (config) => set((state) => ({ a4: { ...state.a4, ...config } })),
      updateCashDrawer: (config) => set((state) => ({ cashDrawer: { ...state.cashDrawer, ...config } })),
      updateCustomerDisplay: (config) => set((state) => ({ customerDisplay: { ...state.customerDisplay, ...config } })),
      resetAll: () => set(DEFAULT_STATE),
    }),
    { name: 'bill-dale-devices' }
  )
);
