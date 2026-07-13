/**
 * Approximate region centers for Vent Globe markers.
 * Keys: "CC:State Name" or "CC:_country" for country-level fallback.
 * Coordinates are public geographic centroids (not user positions).
 */

export interface StateCenter {
  lat: number
  lng: number
  label: string
}

/** Country-level fallbacks when state is missing or unknown. */
export const COUNTRY_CENTERS: Record<string, StateCenter> = {
  US: { lat: 39.83, lng: -98.58, label: 'United States' },
  CA: { lat: 56.13, lng: -106.35, label: 'Canada' },
  GB: { lat: 55.38, lng: -3.44, label: 'United Kingdom' },
  DE: { lat: 51.17, lng: 10.45, label: 'Germany' },
  FR: { lat: 46.23, lng: 2.21, label: 'France' },
  IN: { lat: 20.59, lng: 78.96, label: 'India' },
  AU: { lat: -25.27, lng: 133.78, label: 'Australia' },
  BR: { lat: -14.24, lng: -51.93, label: 'Brazil' },
  MX: { lat: 23.63, lng: -102.55, label: 'Mexico' },
  JP: { lat: 36.2, lng: 138.25, label: 'Japan' },
  CN: { lat: 35.86, lng: 104.2, label: 'China' },
  KR: { lat: 35.91, lng: 127.77, label: 'South Korea' },
  ES: { lat: 40.46, lng: -3.75, label: 'Spain' },
  IT: { lat: 41.87, lng: 12.57, label: 'Italy' },
  NL: { lat: 52.13, lng: 5.29, label: 'Netherlands' },
  SE: { lat: 60.13, lng: 18.64, label: 'Sweden' },
  NO: { lat: 60.47, lng: 8.47, label: 'Norway' },
  PL: { lat: 51.92, lng: 19.15, label: 'Poland' },
  ZA: { lat: -30.56, lng: 22.94, label: 'South Africa' },
  NG: { lat: 9.08, lng: 8.68, label: 'Nigeria' },
  EG: { lat: 26.82, lng: 30.8, label: 'Egypt' },
  AR: { lat: -38.42, lng: -63.62, label: 'Argentina' },
  CL: { lat: -35.68, lng: -71.54, label: 'Chile' },
  CO: { lat: 4.57, lng: -74.3, label: 'Colombia' },
  PH: { lat: 12.88, lng: 121.77, label: 'Philippines' },
  ID: { lat: -0.79, lng: 113.92, label: 'Indonesia' },
  TH: { lat: 15.87, lng: 100.99, label: 'Thailand' },
  VN: { lat: 14.06, lng: 108.28, label: 'Vietnam' },
  NZ: { lat: -40.9, lng: 174.89, label: 'New Zealand' },
  IE: { lat: 53.14, lng: -7.69, label: 'Ireland' },
  PT: { lat: 39.4, lng: -8.22, label: 'Portugal' },
  TR: { lat: 38.96, lng: 35.24, label: 'Turkey' },
  SA: { lat: 23.89, lng: 45.08, label: 'Saudi Arabia' },
  AE: { lat: 23.42, lng: 53.85, label: 'United Arab Emirates' },
  IL: { lat: 31.05, lng: 34.85, label: 'Israel' },
  SG: { lat: 1.35, lng: 103.82, label: 'Singapore' },
  MY: { lat: 4.21, lng: 101.98, label: 'Malaysia' },
  PK: { lat: 30.38, lng: 69.35, label: 'Pakistan' },
  BD: { lat: 23.68, lng: 90.36, label: 'Bangladesh' },
  RU: { lat: 61.52, lng: 105.32, label: 'Russia' },
  UA: { lat: 48.38, lng: 31.17, label: 'Ukraine' },
  CH: { lat: 46.82, lng: 8.23, label: 'Switzerland' },
  AT: { lat: 47.52, lng: 14.55, label: 'Austria' },
  BE: { lat: 50.5, lng: 4.47, label: 'Belgium' },
  DK: { lat: 56.26, lng: 9.5, label: 'Denmark' },
  FI: { lat: 61.92, lng: 25.75, label: 'Finland' },
  CZ: { lat: 49.82, lng: 15.47, label: 'Czechia' },
  RO: { lat: 45.94, lng: 24.97, label: 'Romania' },
  GR: { lat: 39.07, lng: 21.82, label: 'Greece' },
  HU: { lat: 47.16, lng: 19.5, label: 'Hungary' },
}

/** State / province centers. Key format matches buildRegionKey. */
export const STATE_CENTERS: Record<string, StateCenter> = {
  // United States
  'US:Alabama': { lat: 32.81, lng: -86.79, label: 'Alabama' },
  'US:Alaska': { lat: 61.37, lng: -152.4, label: 'Alaska' },
  'US:Arizona': { lat: 33.73, lng: -111.43, label: 'Arizona' },
  'US:Arkansas': { lat: 34.97, lng: -92.37, label: 'Arkansas' },
  'US:California': { lat: 36.12, lng: -119.68, label: 'California' },
  'US:Colorado': { lat: 39.06, lng: -105.31, label: 'Colorado' },
  'US:Connecticut': { lat: 41.6, lng: -72.76, label: 'Connecticut' },
  'US:Delaware': { lat: 39.32, lng: -75.51, label: 'Delaware' },
  'US:Florida': { lat: 27.77, lng: -81.69, label: 'Florida' },
  'US:Georgia': { lat: 33.04, lng: -83.64, label: 'Georgia' },
  'US:Hawaii': { lat: 21.09, lng: -157.5, label: 'Hawaii' },
  'US:Idaho': { lat: 44.24, lng: -114.48, label: 'Idaho' },
  'US:Illinois': { lat: 40.35, lng: -88.99, label: 'Illinois' },
  'US:Indiana': { lat: 39.85, lng: -86.26, label: 'Indiana' },
  'US:Iowa': { lat: 42.01, lng: -93.21, label: 'Iowa' },
  'US:Kansas': { lat: 38.53, lng: -96.73, label: 'Kansas' },
  'US:Kentucky': { lat: 37.67, lng: -84.67, label: 'Kentucky' },
  'US:Louisiana': { lat: 31.17, lng: -91.87, label: 'Louisiana' },
  'US:Maine': { lat: 44.69, lng: -69.38, label: 'Maine' },
  'US:Maryland': { lat: 39.06, lng: -76.8, label: 'Maryland' },
  'US:Massachusetts': { lat: 42.23, lng: -71.53, label: 'Massachusetts' },
  'US:Michigan': { lat: 43.33, lng: -84.54, label: 'Michigan' },
  'US:Minnesota': { lat: 45.69, lng: -93.9, label: 'Minnesota' },
  'US:Mississippi': { lat: 32.74, lng: -89.68, label: 'Mississippi' },
  'US:Missouri': { lat: 38.46, lng: -92.29, label: 'Missouri' },
  'US:Montana': { lat: 46.92, lng: -110.45, label: 'Montana' },
  'US:Nebraska': { lat: 41.13, lng: -98.27, label: 'Nebraska' },
  'US:Nevada': { lat: 38.31, lng: -117.06, label: 'Nevada' },
  'US:New Hampshire': { lat: 43.45, lng: -71.56, label: 'New Hampshire' },
  'US:New Jersey': { lat: 40.3, lng: -74.52, label: 'New Jersey' },
  'US:New Mexico': { lat: 34.84, lng: -106.25, label: 'New Mexico' },
  'US:New York': { lat: 42.17, lng: -74.95, label: 'New York' },
  'US:North Carolina': { lat: 35.63, lng: -79.81, label: 'North Carolina' },
  'US:North Dakota': { lat: 47.53, lng: -99.78, label: 'North Dakota' },
  'US:Ohio': { lat: 40.39, lng: -82.76, label: 'Ohio' },
  'US:Oklahoma': { lat: 35.57, lng: -96.93, label: 'Oklahoma' },
  'US:Oregon': { lat: 44.57, lng: -122.07, label: 'Oregon' },
  'US:Pennsylvania': { lat: 40.59, lng: -77.21, label: 'Pennsylvania' },
  'US:Rhode Island': { lat: 41.68, lng: -71.51, label: 'Rhode Island' },
  'US:South Carolina': { lat: 33.86, lng: -80.95, label: 'South Carolina' },
  'US:South Dakota': { lat: 44.3, lng: -99.44, label: 'South Dakota' },
  'US:Tennessee': { lat: 35.75, lng: -86.69, label: 'Tennessee' },
  'US:Texas': { lat: 31.05, lng: -97.56, label: 'Texas' },
  'US:Utah': { lat: 40.15, lng: -111.86, label: 'Utah' },
  'US:Vermont': { lat: 44.05, lng: -72.71, label: 'Vermont' },
  'US:Virginia': { lat: 37.77, lng: -78.17, label: 'Virginia' },
  'US:Washington': { lat: 47.4, lng: -121.49, label: 'Washington' },
  'US:West Virginia': { lat: 38.49, lng: -80.95, label: 'West Virginia' },
  'US:Wisconsin': { lat: 44.27, lng: -89.62, label: 'Wisconsin' },
  'US:Wyoming': { lat: 42.76, lng: -107.3, label: 'Wyoming' },
  'US:District of Columbia': { lat: 38.91, lng: -77.04, label: 'District of Columbia' },

  // Canada
  'CA:Alberta': { lat: 53.93, lng: -116.58, label: 'Alberta' },
  'CA:British Columbia': { lat: 53.73, lng: -127.65, label: 'British Columbia' },
  'CA:Manitoba': { lat: 53.76, lng: -98.81, label: 'Manitoba' },
  'CA:New Brunswick': { lat: 46.57, lng: -66.46, label: 'New Brunswick' },
  'CA:Newfoundland and Labrador': { lat: 53.14, lng: -57.66, label: 'Newfoundland and Labrador' },
  'CA:Nova Scotia': { lat: 44.68, lng: -63.74, label: 'Nova Scotia' },
  'CA:Ontario': { lat: 51.25, lng: -85.32, label: 'Ontario' },
  'CA:Prince Edward Island': { lat: 46.51, lng: -63.42, label: 'Prince Edward Island' },
  'CA:Quebec': { lat: 52.94, lng: -73.55, label: 'Quebec' },
  'CA:Saskatchewan': { lat: 52.94, lng: -106.45, label: 'Saskatchewan' },

  // Australia
  'AU:New South Wales': { lat: -31.25, lng: 146.92, label: 'New South Wales' },
  'AU:Victoria': { lat: -36.6, lng: 144.68, label: 'Victoria' },
  'AU:Queensland': { lat: -22.16, lng: 144.5, label: 'Queensland' },
  'AU:Western Australia': { lat: -27.67, lng: 121.63, label: 'Western Australia' },
  'AU:South Australia': { lat: -30.0, lng: 136.21, label: 'South Australia' },
  'AU:Tasmania': { lat: -42.04, lng: 146.64, label: 'Tasmania' },
  'AU:Northern Territory': { lat: -19.49, lng: 132.55, label: 'Northern Territory' },
  'AU:Australian Capital Territory': { lat: -35.47, lng: 149.0, label: 'Australian Capital Territory' },

  // India (major states)
  'IN:Maharashtra': { lat: 19.75, lng: 75.71, label: 'Maharashtra' },
  'IN:Karnataka': { lat: 15.32, lng: 75.71, label: 'Karnataka' },
  'IN:Tamil Nadu': { lat: 11.13, lng: 78.66, label: 'Tamil Nadu' },
  'IN:Delhi': { lat: 28.7, lng: 77.1, label: 'Delhi' },
  'IN:Uttar Pradesh': { lat: 26.85, lng: 80.91, label: 'Uttar Pradesh' },
  'IN:West Bengal': { lat: 22.99, lng: 87.85, label: 'West Bengal' },
  'IN:Gujarat': { lat: 22.26, lng: 71.19, label: 'Gujarat' },
  'IN:Rajasthan': { lat: 27.02, lng: 74.22, label: 'Rajasthan' },
  'IN:Telangana': { lat: 18.11, lng: 79.02, label: 'Telangana' },
  'IN:Kerala': { lat: 10.85, lng: 76.27, label: 'Kerala' },

  // UK nations / regions
  'GB:England': { lat: 52.36, lng: -1.17, label: 'England' },
  'GB:Scotland': { lat: 56.49, lng: -4.2, label: 'Scotland' },
  'GB:Wales': { lat: 52.13, lng: -3.78, label: 'Wales' },
  'GB:Northern Ireland': { lat: 54.79, lng: -6.49, label: 'Northern Ireland' },
}

/** All known static centers for empty-state markers on the globe. */
export function listAllStaticCenters(): Array<{ regionKey: string; center: StateCenter }> {
  const items: Array<{ regionKey: string; center: StateCenter }> = []

  for (const [key, center] of Object.entries(STATE_CENTERS)) {
    items.push({ regionKey: key, center })
  }

  for (const [code, center] of Object.entries(COUNTRY_CENTERS)) {
    items.push({ regionKey: `${code}:_country`, center })
  }

  return items
}

/**
 * Resolve lat/lng for a region.
 * Priority: exact STATE_CENTERS key → case-insensitive state match → country center → avg coords.
 */
export function resolveRegionCenter(options: {
  countryCode: string | null
  state: string | null
  avgLat?: number | null
  avgLng?: number | null
}): { lat: number; lng: number; label: string; source: 'state' | 'country' | 'average' } | null {
  const code = options.countryCode?.toUpperCase() || null
  const state = options.state?.trim() || null

  if (code && state) {
    const exactKey = `${code}:${state}`
    if (STATE_CENTERS[exactKey]) {
      return { ...STATE_CENTERS[exactKey], source: 'state' }
    }

    const lower = state.toLowerCase()
    for (const [key, center] of Object.entries(STATE_CENTERS)) {
      if (!key.startsWith(`${code}:`)) continue
      const keyState = key.slice(code.length + 1)
      if (keyState.toLowerCase() === lower) {
        return { ...center, source: 'state' }
      }
    }
  }

  if (code && COUNTRY_CENTERS[code]) {
    return { ...COUNTRY_CENTERS[code], source: 'country' }
  }

  if (
    options.avgLat != null &&
    options.avgLng != null &&
    Number.isFinite(options.avgLat) &&
    Number.isFinite(options.avgLng)
  ) {
    return {
      lat: options.avgLat,
      lng: options.avgLng,
      label: state || code || 'Unknown',
      source: 'average',
    }
  }

  return null
}
