'use client';

import type { JourneyOption } from '@/api/types';
import { RouteCard } from './RouteCard';

interface RouteOptionsProps {
  routes: JourneyOption[];
  selectedRouteId: string | null;
  onSelectRoute: (id: string) => void;
}

export function RouteOptions({ routes, selectedRouteId, onSelectRoute }: RouteOptionsProps) {
  if (routes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No route options found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {routes.map((route) => (
        <RouteCard
          key={route.id}
          route={route}
          isSelected={selectedRouteId === route.id}
          onSelect={onSelectRoute}
        />
      ))}
    </div>
  );
}
