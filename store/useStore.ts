import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  CartItem,
  Restaurant,
  Section,
  Product,
  SectionProduct,
  Supplier,
  ProductCategory
} from '@/types';

interface AppState {
  // Restaurant & Auth
  currentRestaurant: Restaurant | null;
  setCurrentRestaurant: (restaurant: Restaurant | null) => void;

  // Sections
  sections: Section[];
  setSections: (sections: Section[]) => void;
  currentSection: Section | null;
  setCurrentSection: (section: Section | null) => void;

  // Products
  products: Product[];
  setProducts: (products: Product[]) => void;
  sectionProducts: SectionProduct[];
  setSectionProducts: (products: SectionProduct[]) => void;

  // Categories & Suppliers
  categories: ProductCategory[];
  setCategories: (categories: ProductCategory[]) => void;
  suppliers: Supplier[];
  setSuppliers: (suppliers: Supplier[]) => void;

  // Cart
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (cartId: string) => void;
  updateCartItemQuantity: (cartId: string, quantity: number) => void;
  clearCart: () => void;
  getCartCount: () => number;

  // UI State
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;

  // Utility
  reset: () => void;
}

const initialState = {
  currentRestaurant: null,
  sections: [],
  currentSection: null,
  products: [],
  sectionProducts: [],
  categories: [],
  suppliers: [],
  cart: [],
  isLoading: false,
  error: null,
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Restaurant & Auth
      setCurrentRestaurant: (restaurant) => set({ currentRestaurant: restaurant }),

      // Sections
      setSections: (sections) => set({ sections }),
      setCurrentSection: (section) => set({ currentSection: section }),

      // Products
      setProducts: (products) => set({ products }),
      setSectionProducts: (products) => set({ sectionProducts: products }),

      // Categories & Suppliers
      setCategories: (categories) => set({ categories }),
      setSuppliers: (suppliers) => set({ suppliers }),

      // Cart Management
      addToCart: (item) => set((state) => {
        const existingItem = state.cart.find(i => i.cartId === item.cartId);
        if (existingItem) {
          return {
            cart: state.cart.map(i =>
              i.cartId === item.cartId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            )
          };
        }
        return { cart: [...state.cart, item] };
      }),

      removeFromCart: (cartId) => set((state) => ({
        cart: state.cart.filter(item => item.cartId !== cartId)
      })),

      updateCartItemQuantity: (cartId, quantity) => set((state) => ({
        cart: state.cart.map(item =>
          item.cartId === cartId
            ? { ...item, quantity }
            : item
        )
      })),

      clearCart: () => set({ cart: [] }),

      getCartCount: () => {
        const state = get();
        return state.cart.reduce((sum, item) => sum + item.quantity, 0);
      },

      // UI State
      setIsLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'restaurant-app-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentRestaurant: state.currentRestaurant,
        cart: state.cart,
        currentSection: state.currentSection,
      }),
    }
  )
);

// Selector hooks for common use cases
export const useCart = () => useStore((state) => ({
  items: state.cart,
  add: state.addToCart,
  remove: state.removeFromCart,
  updateQuantity: state.updateCartItemQuantity,
  clear: state.clearCart,
  count: state.getCartCount(),
}));

export const useRestaurant = () => useStore((state) => ({
  current: state.currentRestaurant,
  setCurrent: state.setCurrentRestaurant,
}));

export const useSections = () => useStore((state) => ({
  all: state.sections,
  current: state.currentSection,
  setAll: state.setSections,
  setCurrent: state.setCurrentSection,
}));