export interface TransitStopData {
  id: string;
  name: string;
  lat: number;
  lon: number;
  zone: string;
}

export interface TransitRouteData {
  id: string;
  routeNumber: string;
  longName: string;
  busType: 'Standard' | 'AC' | 'Electric';
  fareBaseRupees: number;
  stops: string[]; // stop IDs in order
}

export const DELHI_STOPS: TransitStopData[] = [
  { id: 'stop-cp', name: 'Connaught Place (Palika Kendra)', lat: 28.6315, lon: 77.2167, zone: 'Central' },
  { id: 'stop-kg', name: 'Kashmere Gate ISBT', lat: 28.6675, lon: 77.2285, zone: 'North' },
  { id: 'stop-delhi-gate', name: 'Delhi Gate / Asaf Ali Road', lat: 28.6418, lon: 77.2405, zone: 'Central' },
  { id: 'stop-ito', name: 'ITO Transit Terminal', lat: 28.6289, lon: 77.2421, zone: 'Central' },
  { id: 'stop-aiims', name: 'AIIMS / Ansari Nagar', lat: 28.5672, lon: 77.2100, zone: 'South' },
  { id: 'stop-hauz-khas', name: 'Hauz Khas Metro Interchange', lat: 28.5431, lon: 77.2065, zone: 'South' },
  { id: 'stop-saket', name: 'Saket District Centre', lat: 28.5244, lon: 77.2167, zone: 'South' },
  { id: 'stop-nehru-place', name: 'Nehru Place Bus Terminal', lat: 28.5494, lon: 77.2528, zone: 'South-East' },
  { id: 'stop-lajpat-nagar', name: 'Lajpat Nagar Central Market', lat: 28.5700, lon: 77.2400, zone: 'South' },
  { id: 'stop-dhaula-kuan', name: 'Dhaula Kuan Interchange', lat: 28.5921, lon: 77.1616, zone: 'South-West' },
  { id: 'stop-karol-bagh', name: 'Karol Bagh Metro', lat: 28.6441, lon: 77.1906, zone: 'West' },
  { id: 'stop-anand-vihar', name: 'Anand Vihar ISBT', lat: 28.6469, lon: 77.3164, zone: 'East' },
  { id: 'stop-mehrauli', name: 'Mehrauli Terminal', lat: 28.5175, lon: 77.1855, zone: 'South' },
  { id: 'stop-punjabi-bagh', name: 'Punjabi Bagh Terminal', lat: 28.6692, lon: 77.1311, zone: 'West' }
];

export const DELHI_ROUTES: TransitRouteData[] = [
  {
    id: 'route-502',
    routeNumber: '502',
    longName: 'Mehrauli Terminal to Kashmere Gate ISBT',
    busType: 'Electric',
    fareBaseRupees: 15,
    stops: ['stop-mehrauli', 'stop-saket', 'stop-hauz-khas', 'stop-aiims', 'stop-cp', 'stop-kg']
  },
  {
    id: 'route-419',
    routeNumber: '419',
    longName: 'Nehru Place Terminal to Kashmere Gate ISBT',
    busType: 'AC',
    fareBaseRupees: 20,
    stops: ['stop-nehru-place', 'stop-lajpat-nagar', 'stop-ito', 'stop-delhi-gate', 'stop-kg']
  },
  {
    id: 'route-729',
    routeNumber: '729',
    longName: 'Dhaula Kuan to Anand Vihar ISBT',
    busType: 'Standard',
    fareBaseRupees: 15,
    stops: ['stop-dhaula-kuan', 'stop-karol-bagh', 'stop-cp', 'stop-ito', 'stop-anand-vihar']
  },
  {
    id: 'route-tms',
    routeNumber: 'TMS',
    longName: 'Teevro Mudrika Seva (Outer Ring Road)',
    busType: 'Electric',
    fareBaseRupees: 25,
    stops: ['stop-lajpat-nagar', 'stop-aiims', 'stop-dhaula-kuan', 'stop-punjabi-bagh', 'stop-kg', 'stop-anand-vihar']
  },
  {
    id: 'route-615',
    routeNumber: '615',
    longName: 'Hauz Khas to Connaught Place',
    busType: 'Standard',
    fareBaseRupees: 10,
    stops: ['stop-hauz-khas', 'stop-aiims', 'stop-lajpat-nagar', 'stop-cp']
  }
];

export function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function findNearestStop(lat: number, lon: number): TransitStopData {
  let nearest = DELHI_STOPS[0];
  let minDistance = Infinity;

  for (const stop of DELHI_STOPS) {
    const dist = haversineDistanceMeters(lat, lon, stop.lat, stop.lon);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = stop;
    }
  }

  return nearest;
}
