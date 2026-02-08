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
        return state.cart.length;
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
export const useCart = () => {
  const items = useStore((state) => state.cart);
  const add = useStore((state) => state.addToCart);
  const remove = useStore((state) => state.removeFromCart);
  const updateQuantity = useStore((state) => state.updateCartItemQuantity);
  const clear = useStore((state) => state.clearCart);
  const getCartCount = useStore((state) => state.getCartCount);

  return {
    items,
    add,
    remove,
    updateQuantity,
    clear,
    count: getCartCount(),
  };
};

export const useRestaurant = () => {
  const current = useStore((state) => state.currentRestaurant);
  const setCurrent = useStore((state) => state.setCurrentRestaurant);

  return {
    current,
    setCurrent,
  };
};

export const useSections = () => {
  const all = useStore((state) => state.sections);
  const current = useStore((state) => state.currentSection);
  const setAll = useStore((state) => state.setSections);
  const setCurrent = useStore((state) => state.setCurrentSection);

  return {
    all,
    current,
    setAll,
    setCurrent,
  };
};