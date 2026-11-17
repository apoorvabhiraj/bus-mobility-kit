'use client';

// Stop search / autocomplete input backed by the /stops OpenAPI endpoint.

import { useState, useRef, useEffect } from 'react';
import type { Stop } from '@/api/types';

interface StopSearchProps {
  label: string;
  value: string | null;
  onChange: (stop: Stop | null) => void;
  placeholder?: string;
}

export function StopSearch({ label, value, onChange, placeholder }: StopSearchProps) {
  const [query, setQuery] = useState(value ?? '');
  const [results, setResults] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(value ?? '');
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    setOpen(true);
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Debounce
    clearTimeout((window as any).stopSearchTimer);
    (window as any).stopSearchTimer = setTimeout(async () => {
      try {
        // TODO: call api.searchStops(q) when backend is available.
        const { mockSearchStops } = await import('@/mock/data');
        const stops = await mockSearchStops(q);
        setResults(stops);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
  };

  const handleSelect = (stop: Stop) => {
    setQuery(stop.name);
    setOpen(false);
    onChange(stop);
  };

  const handleBlur = () => {
    // Blur fires before click on list items, so delay closing
    setTimeout(() => setOpen(false), 150);
  };

  const inputId = `stop-search-${label.toLowerCase().replace(/\s/g, '-')}`;

  return (
    <div className="relative">
      <label className="label-text" htmlFor={inputId}>
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          className="input-field pr-10"
          value={query}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder ?? 'Search stops...'}
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-3 text-xs text-gray-400">Searching…</span>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((stop) => (
            <button
              key={stop.id}
              onClick={() => handleSelect(stop)}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-gray-900">{stop.name}</div>
              <div className="text-xs text-gray-500">{stop.zone ?? ''}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
