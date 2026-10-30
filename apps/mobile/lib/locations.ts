import AsyncStorage from '@react-native-async-storage/async-storage';

export type AreaHub = {
  id: string;
  label: string;
  region: string;
  lat: number;
  lng: number;
  /** Extra search tokens (incl. common typos). */
  aliases: string[];
};

/** Launch hubs + travel destinations players can search into. */
export const AREA_HUBS: AreaHub[] = [
  {
    id: 'sotogrande',
    label: 'Sotogrande',
    region: 'South Spain',
    lat: 36.287,
    lng: -5.278,
    aliases: ['soto', 'la reserva', 'puerto sotogrande'],
  },
  {
    id: 'marbella',
    label: 'Marbella',
    region: 'South Spain',
    lat: 36.509,
    lng: -4.886,
    aliases: ['puerto banus', 'banús'],
  },
  {
    id: 'malaga',
    label: 'Málaga',
    region: 'South Spain',
    lat: 36.721,
    lng: -4.421,
    aliases: ['malaga', 'málaga'],
  },
  {
    id: 'madrid',
    label: 'Madrid',
    region: 'Spain',
    lat: 40.416,
    lng: -3.703,
    aliases: ['madrid centro', 'chamartin'],
  },
  {
    id: 'london',
    label: 'London',
    region: 'England',
    lat: 51.507,
    lng: -0.128,
    aliases: ['ldn', 'london bridge'],
  },
  {
    id: 'buenos-aires',
    label: 'Buenos Aires',
    region: 'Argentina',
    lat: -34.604,
    lng: -58.382,
    aliases: ['buenas aires', 'bsas', 'bs as', 'caba', 'argentina'],
  },
];

const HUB_KEY = 'pn.currentAreaHub.v1';

function normalize(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function hubFromLabel(locationLabel: string | null | undefined): string | null {
  if (!locationLabel) return null;
  const lower = normalize(locationLabel);
  for (const hub of AREA_HUBS) {
    if (lower.includes(normalize(hub.label)) || lower.includes(hub.id)) return hub.id;
    if (hub.aliases.some((a) => lower.includes(normalize(a)))) return hub.id;
  }
  return null;
}

/** Match a typed city query to a hub (Madrid, Buenas Aires, etc.). */
export function matchHubQuery(query: string): AreaHub | null {
  const q = normalize(query);
  if (q.length < 2) return null;

  for (const hub of AREA_HUBS) {
    const label = normalize(hub.label);
    if (label.startsWith(q) || q.startsWith(label) || label.includes(q)) return hub;
    if (hub.aliases.some((a) => {
      const n = normalize(a);
      return n.startsWith(q) || q.startsWith(n) || n.includes(q) || q.includes(n);
    })) {
      return hub;
    }
  }
  return null;
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function nearestHub(lat: number, lng: number): AreaHub {
  let best = AREA_HUBS[0]!;
  let bestKm = Infinity;
  for (const hub of AREA_HUBS) {
    const km = haversineKm({ lat, lng }, hub);
    if (km < bestKm) {
      bestKm = km;
      best = hub;
    }
  }
  return best;
}

export async function getCurrentAreaHub(): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem(HUB_KEY);
    if (raw && AREA_HUBS.some((h) => h.id === raw)) return raw;
  } catch {
    /* ignore */
  }
  return 'sotogrande';
}

export async function setCurrentAreaHub(hubId: string): Promise<string> {
  const hub = AREA_HUBS.find((h) => h.id === hubId) ?? AREA_HUBS[0]!;
  await AsyncStorage.setItem(HUB_KEY, hub.id);
  return hub.id;
}

export function hubLabel(hubId: string) {
  return AREA_HUBS.find((h) => h.id === hubId)?.label ?? 'Sotogrande';
}

export function getHub(hubId: string): AreaHub | undefined {
  return AREA_HUBS.find((h) => h.id === hubId);
}
