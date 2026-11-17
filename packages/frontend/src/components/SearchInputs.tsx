'use client';


import type { LocationPoint } from '@/api/types';
import { StopSearch } from './StopSearch';

interface SearchInputsProps {
  origin: LocationPoint | null;
  destination: LocationPoint | null;
  departureTime: string | null;
  onSetOrigin: (point: LocationPoint | null) => void;
  onSetDestination: (point: LocationPoint | null) => void;
  onSetDepartureTime: (time: string | null) => void;
  onSwap: () => void;
}

export function SearchInputs({
  origin,
  destination,
  departureTime,
  onSetOrigin,
  onSetDestination,
  onSetDepartureTime,
  onSwap,
}: SearchInputsProps) {

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
      <StopSearch
        label="Origin"
        value={origin?.name ?? null}
        onChange={(stop) =>
          onSetOrigin(stop ? { lat: stop.lat, lon: stop.lon, name: stop.name, stopId: stop.id } : null)
        }
        placeholder="e.g., Kashmere Gate"
      />
      <StopSearch
        label="Destination"
        value={destination?.name ?? null}
        onChange={(stop) =>
          onSetDestination(stop ? { lat: stop.lat, lon: stop.lon, name: stop.name, stopId: stop.id } : null)
        }
        placeholder="e.g., Anand Vihar"
      />
      <div className="md:col-span-2 flex items-center gap-2">
        <button
          onClick={onSwap}
          className="btn-outline px-3 py-2 text-xs"
          title="Swap origin and destination"
        >
          ↮
        </button>
        <label className="label-text hidden sm:block">Departure time</label>
        <input
          type="datetime-local"
          className="input-field"
          value={departureTime ?? ''}
          onChange={(e) => onSetDepartureTime(e.target.value || null)}
        />
      </div>
    </div>
  );
}
