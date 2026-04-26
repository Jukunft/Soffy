// Países LATAM soportados — fuente única para AuthScreen + ZoneDrawer + Profile.
// IDs ISO 3166-1 alpha-2 lowercase.

export const COUNTRIES = [
  { id: 'ar', name: 'Argentina',         flag: '🇦🇷' },
  { id: 'bo', name: 'Bolivia',           flag: '🇧🇴' },
  { id: 'br', name: 'Brasil',            flag: '🇧🇷' },
  { id: 'cl', name: 'Chile',             flag: '🇨🇱' },
  { id: 'co', name: 'Colombia',          flag: '🇨🇴' },
  { id: 'cr', name: 'Costa Rica',        flag: '🇨🇷' },
  { id: 'ec', name: 'Ecuador',           flag: '🇪🇨' },
  { id: 'mx', name: 'México',            flag: '🇲🇽' },
  { id: 'pa', name: 'Panamá',            flag: '🇵🇦' },
  { id: 'pe', name: 'Perú',              flag: '🇵🇪' },
  { id: 'py', name: 'Paraguay',          flag: '🇵🇾' },
  { id: 'uy', name: 'Uruguay',           flag: '🇺🇾' },
  { id: 've', name: 'Venezuela',         flag: '🇻🇪' },
];

export const COUNTRY_BY_ID = Object.fromEntries(COUNTRIES.map(c => [c.id, c]));
export const DEFAULT_COUNTRY = 'cl';
