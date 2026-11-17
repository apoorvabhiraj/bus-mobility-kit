// API client consuming the OpenAPI contracts in schemas/contracts/
// Base URL per journey-api-v1.yaml: http://localhost:4000/api/v1
// This client only reads/consumes contracts — it never modifies them.

import type {
  JourneyPlanRequest,
  JourneyPlanResponse,
  SearchStopsResponse,
  HealthResponse,
  ErrorResponse,
} from './types';

const API_BASE_URL = (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1';

class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let code = 'UNKNOWN_ERROR';
    let message = `Request failed with status ${response.status}`;
    let details: unknown;
    try {
      const body = (await response.json()) as ErrorResponse & { error?: string };
      code = body.code ?? code;
      message = body.message ?? body.error ?? message;
      details = body.details;
    } catch {
      // ignore parse errors, use status text
      message = response.statusText || message;
    }
    throw new ApiError(response.status, code, message, details);
  }
  return response.json() as T;
}

export const api = {
  async health(): Promise<HealthResponse> {
    const res = await fetch(`${API_BASE_URL}/health`);
    return handleResponse<HealthResponse>(res);
  },

  async planJourney(request: JourneyPlanRequest): Promise<JourneyPlanResponse> {
    const res = await fetch(`${API_BASE_URL}/journeys/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse<JourneyPlanResponse>(res);
  },

  async searchStops(query?: string, lat?: number, lon?: number, limit = 10): Promise<SearchStopsResponse> {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (lat !== undefined) params.set('lat', String(lat));
    if (lon !== undefined) params.set('lon', String(lon));
    params.set('limit', String(limit));
    const res = await fetch(`${API_BASE_URL}/stops?${params.toString()}`);
    return handleResponse<SearchStopsResponse>(res);
  },
};

export { ApiError };
