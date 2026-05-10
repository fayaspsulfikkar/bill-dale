import { create } from 'zustand';
import type { Product } from '@/offline/db';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  discount: number; // Flat discount amount
  addItem: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  setDiscount: (amount: number) => void;
  clearCart: () => void;
  getTotals: () => { subtotal: number; taxAmount: number; total: number };
}

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  discount: 0,
  
  addItem: (product, quantity = 1) => {
    set((state) => {
      const existing = state.items.find((item) => item.product.id === product.id);
      if (existing) {
        return {
          items: state.items.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          ),
        };
      }
      return { items: [...state.items, { product, quantity }] };
    });
  },

  updateQuantity: (productId, quantity) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.product.id === productId ? { ...item, quantity: Math.max(1, quantity) } : item
      ),
    }));
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((item) => item.product.id !== productId),
    }));
  },

  setDiscount: (amount) => set({ discount: Math.max(0, amount) }),

  clearCart: () => set({ items: [], discount: 0 }),

  getTotals: () => {
    const { items, discount } = get();
    let subtotal = 0;
    let taxAmount = 0;

    items.forEach((item) => {
      const itemTotal = item.product.price * item.quantity;
      const itemTax = (itemTotal * item.product.gst_percent) / 100;
      subtotal += itemTotal;
      taxAmount += itemTax;
    });

    const total = Math.max(0, subtotal + taxAmount - discount);
    
    return { subtotal, taxAmount, total };
  },
}));
