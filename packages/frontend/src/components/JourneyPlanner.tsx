'use client';

// Main journey planner UI container.
// Combines origin/destination search, route options display,
// Problem 1 travel time estimates, and Problem 2 crowdedness levels.
// Mobile-responsive with a single-column stack on small screens.

import { useJourneyStore } from '@/store/journeyStore';
import type { JourneyPlanRequest } from '@/api/types';
import { SearchInputs } from './SearchInputs';
import { RouteOptions } from './RouteOptions';
import { TravelTimeDisplay } from './TravelTimeDisplay';
import { CrowdednessDisplay } from './CrowdednessDisplay';

export function JourneyPlanner() {
  const {
    origin,
    destination,
    departureTime,
    results,
    loading,
    error,
    selectedRoute,
    crowdingTolerance,
    showOnlyLowCrowding,
    setOrigin,
    setDestination,
    setDepartureTime,
    planJourney,
    clearResults,
    setShowOnlyLowCrowding,
    filteredRoutes,
  } = useJourneyStore();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination) return;

    const request: JourneyPlanRequest = {
      origin,
      destination,
      departureTime: departureTime ?? new Date().toISOString(),
      preferences: {
        optimizeFor: 'balanced',
        maxTransfers: 3,
        maxWalkingDistanceMeters: 1200,
        crowdingTolerance,
        includeCrowding: true,
        includeTravelTimePercentiles: true,
      },
    };

    planJourney(request);
  };

  if (!origin && !destination) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Delhi Bus Journey Planner</h1>
          <p className="text-gray-600 mt-1">
            Plan your bus journey across Delhi with travel-time estimates (Problem 1) and
            crowdedness-aware routing (Problem 2).
          </p>
        </div>
        <form onSubmit={handleSearch} className="space-y-6">
          <SearchInputs
            origin={origin}
            destination={destination}
            departureTime={departureTime}
            onSetOrigin={setOrigin}
            onSetDestination={setDestination}
            onSetDepartureTime={setDepartureTime}
            onSwap={() => {
              const tmp = origin;
              setOrigin(destination ?? null);
              setDestination(tmp ?? null);
            }}
          />
          <button
            type="submit"
            disabled={!origin || !destination || loading}
            className="btn-primary w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching…' : 'Plan journey'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left: search inputs */}
        <div className="lg:w-1/3 flex-shrink-0">
          <form onSubmit={handleSearch} className="space-y-4">
            <SearchInputs
              origin={origin}
              destination={destination}
              departureTime={departureTime}
              onSetOrigin={setOrigin}
              onSetDestination={setDestination}
              onSetDepartureTime={setDepartureTime}
              onSwap={() => {
                const tmp = origin;
                setOrigin(destination ?? null);
                setDestination(tmp ?? null);
              }}
            />
            <button
              type="submit"
              disabled={!origin || !destination || loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching…' : 'Plan journey'}
            </button>
          </form>
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-800">
              {error}
              <button
                onClick={clearResults}
                className="mt-2 text-xs underline text-red-600"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* Right: results */}
        <div className="lg:w-2/3 flex-1">
          {loading && !results ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              Finding the best routes for you…
            </div>
          ) : results ? (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900">Route options</h2>
                <p className="text-gray-600 text-sm">
                  {results.routesCount} option{results.routesCount !== 1 ? 's' : ''} found
                </p>
              </div>

              {/* Crowdedness filters (Problem 2) */}
              <div className="mb-6 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-xs font-medium text-gray-500 uppercase mb-3">Crowdedness filter</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowOnlyLowCrowding(false)}
                    className={`px-3 py-1.5 rounded text-sm ${
                      !showOnlyLowCrowding
                        ? 'bg-delhi-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300'
                    }`}
                  >
                    All routes
                  </button>
                  <button
                    onClick={() => setShowOnlyLowCrowding(true)}
                    className={`px-3 py-1.5 rounded text-sm ${
                      showOnlyLowCrowding
                        ? 'bg-delhi-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300'
                    }`}
                  >
                    Low & moderate only
                  </button>
                </div>
              </div>

              <RouteOptions
                routes={filteredRoutes}
                selectedRouteId={selectedRoute?.id ?? null}
                onSelectRoute={() => {
                  // Selection handled via store's internal setSelectedRouteId
                }}
              />
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Enter origin and destination to plan your journey.
            </div>
          )}
        </div>
      </div>

      {/* Selected route detail panel */}
      {selectedRoute && (
        <div className="mt-8 card p-6">
          <div className="flex items-between justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Selected route details</h3>
            <button
              onClick={() => {
                // clear selection handled externally
              }}
              className="text-sm text-delhi-600 hover:underline"
            >
              Change route
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TravelTimeDisplay metrics={selectedRoute.problem1TravelTimeMetrics} />
            <CrowdednessDisplay metrics={selectedRoute.problem2CrowdednessMetrics} />
          </div>
        </div>
      )}
    </div>
  );
}
