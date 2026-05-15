import { create } from 'zustand';
import type { Product } from '@/offline/db';

export interface CartItem {
  product: Product;
  quantity: number;
  itemDiscount: number; // Flat discount on this specific item (per unit or total, let's say total for the line)
  overridePrice?: number; // Custom unit price override
}

interface CartState {
  items: CartItem[];
  discount: number; // Global flat discount
  addItem: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateItemDiscount: (productId: string, discount: number) => void;
  updateItemPrice: (productId: string, price: number | undefined) => void;
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
      return { items: [...state.items, { product, quantity, itemDiscount: 0 }] };
    });
  },

  updateQuantity: (productId, quantity) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.product.id === productId ? { ...item, quantity: Math.max(1, quantity) } : item
      ),
    }));
  },

  updateItemDiscount: (productId, discount) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.product.id === productId ? { ...item, itemDiscount: Math.max(0, discount) } : item
      ),
    }));
  },

  updateItemPrice: (productId, price) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.product.id === productId ? { ...item, overridePrice: price } : item
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
      const unitPrice = item.overridePrice !== undefined ? item.overridePrice : item.product.price;
      const baseLineTotal = unitPrice * item.quantity;
      const lineTotalAfterItemDiscount = Math.max(0, baseLineTotal - item.itemDiscount);
      
      // Calculate tax on the discounted amount
      const itemTax = (lineTotalAfterItemDiscount * item.product.gst_percent) / 100;
      
      subtotal += lineTotalAfterItemDiscount;
      taxAmount += itemTax;
    });

    const total = Math.max(0, subtotal + taxAmount - discount);
    
    return { subtotal, taxAmount, total };
  },
}));
