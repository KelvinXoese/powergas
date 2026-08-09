import { create } from 'zustand';

interface RiderState {
  activeOrderId: string | null;
  available: boolean;
  setActiveOrderId: (id: string | null) => void;
  setAvailable: (value: boolean) => void;
}

/**
 * Deliberately app-wide, not screen-local. Location sharing needs to keep
 * running for the whole duration of a delivery — pickup, the station leg,
 * and drop-off — regardless of which screen the rider is currently looking
 * at. Keeping activeOrderId here (read by a hook mounted at the App level)
 * instead of as local state in DashboardScreen is what fixes that.
 */
export const useRiderStore = create<RiderState>((set) => ({
  activeOrderId: null,
  available: false,
  setActiveOrderId: (id) => set({ activeOrderId: id }),
  setAvailable: (value) => set({ available: value }),
}));
