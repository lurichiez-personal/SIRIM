
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Plan {
  price: number;
}

interface MarketingState {
  plans: {
    basico: Plan;
    pro: Plan;
    premium: Plan;
  };
  landingImageUrl: string;
  updatePlanPrice: (plan: 'basico' | 'pro' | 'premium', price: number) => void;
  updateLandingImage: (url: string) => void;
}

export const useMarketingStore = create<MarketingState>()(
  persist(
    (set) => ({
      plans: {
        basico: { price: 25 },
        pro: { price: 45 },
        premium: { price: 75 },
      },
      landingImageUrl: 'https://images.unsplash.com/photo-1634733591032-3a53b624c25f?q=80&w=2574&auto=format&fit=crop',
      updatePlanPrice: (plan, price) =>
        set((state) => ({
          plans: {
            ...state.plans,
            [plan]: { ...state.plans[plan], price },
          },
        })),
      updateLandingImage: (url) => set({ landingImageUrl: url }),
    }),
    {
      name: 'sirim-marketing-storage',
    }
  )
);
