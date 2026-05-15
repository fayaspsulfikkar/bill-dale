import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Customer, HeldOrder, CashRegister } from '@/offline/db';

export interface POSState {
  selectedBranchId: string | null;
  setSelectedBranchId: (id: string | null) => void;

  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;

  heldOrders: HeldOrder[];
  setHeldOrders: (orders: HeldOrder[]) => void;
  addHeldOrder: (order: HeldOrder) => void;
  removeHeldOrder: (id: string) => void;

  isReturnMode: boolean;
  returnInvoiceId: string | null;
  setReturnMode: (active: boolean, invoiceId?: string | null) => void;

  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  pendingSyncCount: number;
  setPendingSyncCount: (count: number) => void;

  activeCashRegister: CashRegister | null;
  setActiveCashRegister: (register: CashRegister | null) => void;

  orderNotes: string;
  setOrderNotes: (notes: string) => void;

  showShortcutsHelp: boolean;
  setShowShortcutsHelp: (show: boolean) => void;
  showRecentOrders: boolean;
  setShowRecentOrders: (show: boolean) => void;
  showHeldOrders: boolean;
  setShowHeldOrders: (show: boolean) => void;
  showCashRegister: boolean;
  setShowCashRegister: (show: boolean) => void;
  showQuickAdd: boolean;
  setShowQuickAdd: (show: boolean) => void;

  resetPOSState: () => void;
}

export const usePOSStore = create<POSState>()(
  persist(
    (set) => ({
      selectedBranchId: null,
      setSelectedBranchId: (id) => set({ selectedBranchId: id }),

      selectedCustomer: null,
      setSelectedCustomer: (customer) => set({ selectedCustomer: customer }),

      heldOrders: [],
      setHeldOrders: (orders) => set({ heldOrders: orders }),
      addHeldOrder: (order) => set((state) => ({ heldOrders: [...state.heldOrders, order] })),
      removeHeldOrder: (id) => set((state) => ({ heldOrders: state.heldOrders.filter((o) => o.id !== id) })),

      isReturnMode: false,
      returnInvoiceId: null,
      setReturnMode: (active, invoiceId = null) => set({ isReturnMode: active, returnInvoiceId: invoiceId }),

      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      setIsOnline: (online) => set({ isOnline: online }),
      pendingSyncCount: 0,
      setPendingSyncCount: (count) => set({ pendingSyncCount: count }),

      activeCashRegister: null,
      setActiveCashRegister: (register) => set({ activeCashRegister: register }),

      orderNotes: '',
      setOrderNotes: (notes) => set({ orderNotes: notes }),

      showShortcutsHelp: false,
      setShowShortcutsHelp: (show) => set({ showShortcutsHelp: show }),
      showRecentOrders: false,
      setShowRecentOrders: (show) => set({ showRecentOrders: show }),
      showHeldOrders: false,
      setShowHeldOrders: (show) => set({ showHeldOrders: show }),
      showCashRegister: false,
      setShowCashRegister: (show) => set({ showCashRegister: show }),
      showQuickAdd: false,
      setShowQuickAdd: (show) => set({ showQuickAdd: show }),

      resetPOSState: () => set({
        selectedCustomer: null,
        isReturnMode: false,
        returnInvoiceId: null,
        orderNotes: '',
        showHeldOrders: false,
        showRecentOrders: false,
        showCashRegister: false,
        showQuickAdd: false,
      }),
    }),
    {
      name: 'bill-dale-pos',
      partialize: (s) => ({ selectedBranchId: s.selectedBranchId }),
    }
  )
);
