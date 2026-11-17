// Zustand store for journey search state.
// Holds origin/destination, search results, loading/error state, and crowdedness filters.

import { create } from 'zustand';
import type {
  LocationPoint,
  JourneyPreferences,
  JourneyPlanRequest,
  JourneyPlanResponse,
  JourneyOption,
  Stop,
} from '@/api/types';

export interface JourneyState {
  // Search inputs
  origin: LocationPoint | null;
  destination: LocationPoint | null;
  departureTime: string | null;
  preferences: JourneyPreferences;

  // Stop search
  stopSearchResults: Stop[];
  stopSearchQuery: string;
  stopSearchLoading: boolean;

  // Journey results
  results: JourneyPlanResponse | null;
  selectedRouteId: string | null;
  loading: boolean;
  error: string | null;

  // Crowdedness filters (Problem 2)
  crowdingTolerance: 'low' | 'medium' | 'high';
  showOnlyLowCrowding: boolean;

  // Actions
  setOrigin: (origin: LocationPoint | null) => void;
  setDestination: (destination: LocationPoint | null) => void;
  setDepartureTime: (time: string | null) => void;
  setPreferences: (prefs: Partial<JourneyPreferences>) => void;
  setStopSearchResults: (stops: Stop[]) => void;
  setStopSearchQuery: (query: string) => void;
  setStopSearchLoading: (loading: boolean) => void;
  setSelectedRouteId: (routeId: string | null) => void;
  setCrowdingTolerance: (tolerance: 'low' | 'medium' | 'high') => void;
  setShowOnlyLowCrowding: (show: boolean) => void;

  planJourney: (request: JourneyPlanRequest) => Promise<void>;
  clearResults: () => void;
  reset: () => void;

  // Derived
  selectedRoute: JourneyOption | null;
  filteredRoutes: JourneyOption[];
}

const defaultPreferences: JourneyPreferences = {
  optimizeFor: 'balanced',
  maxTransfers: 3,
  maxWalkingDistanceMeters: 1200,
  crowdingTolerance: 'medium',
  includeCrowding: true,
  includeTravelTimePercentiles: true,
};

export const useJourneyStore = create<JourneyState>((set, get) => ({
  origin: null,
  destination: null,
  departureTime: null,
  preferences: defaultPreferences,

  stopSearchResults: [],
  stopSearchQuery: '',
  stopSearchLoading: false,

  results: null,
  selectedRouteId: null,
  loading: false,
  error: null,

  crowdingTolerance: 'medium',
  showOnlyLowCrowding: false,

  setOrigin: (origin) => set({ origin }),
  setDestination: (destination) => set({ destination }),
  setDepartureTime: (departureTime) => set({ departureTime }),
  setPreferences: (prefs) =>
    set((state) => ({ preferences: { ...state.preferences, ...prefs } })),
  setStopSearchResults: (stops) => set({ stopSearchResults: stops }),
  setStopSearchQuery: (query) => set({ stopSearchQuery: query }),
  setStopSearchLoading: (loading) => set({ stopSearchLoading: loading }),
  setSelectedRouteId: (routeId) => set({ selectedRouteId: routeId }),
  setCrowdingTolerance: (tolerance) => set({ crowdingTolerance: tolerance }),
  setShowOnlyLowCrowding: (show) => set({ showOnlyLowCrowding: show }),

  planJourney: async () => {
    set({ loading: true, error: null });
    try {
      // TODO: call api.planJourney(request) when backend is available.
      // For now, use mock data so the UI works end-to-end.
      const { mockPlanJourney } = await import('@/mock/data');
      const response = await mockPlanJourney();
      set({ results: response, loading: false, error: null });
      if (response.routes.length > 0) {
        set({ selectedRouteId: response.routes[0].id });
      }
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to plan journey',
      });
    }
  },

  clearResults: () => set({ results: null, selectedRouteId: null, error: null }),

  reset: () =>
    set({
      origin: null,
      destination: null,
      departureTime: null,
      preferences: defaultPreferences,
      results: null,
      selectedRouteId: null,
      loading: false,
      error: null,
      stopSearchResults: [],
      stopSearchQuery: '',
    }),

  get selectedRoute() {
    const state = get();
    if (!state.results || !state.selectedRouteId) return null;
    return state.results.routes.find((r) => r.id === state.selectedRouteId) ?? null;
  },

  get filteredRoutes() {
    const state = get();
    if (!state.results) return [];
    let routes = state.results.routes;
    if (state.showOnlyLowCrowding) {
      routes = routes.filter(
        (r) =>
          r.problem2CrowdednessMetrics.overallCrowdingLevel === 'low' ||
          r.problem2CrowdednessMetrics.overallCrowdingLevel === 'moderate'
      );
    }
    return routes;
  },
}));
