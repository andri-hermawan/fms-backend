import * as turf from '@turf/turf';
import { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson';

export interface GeofenceLocation {
  segmentName: string;
  categoryLocation: string;
  origFid: number;
  isInside: boolean;
}

/**
 * Cari polygon geojson project yang memuat koordinat.
 * Jika beberapa polygon cocok, feature terakhir yang dipakai.
 */
export function locateInGeofence(
  geojsonRaw: unknown,
  longitude: number,
  latitude: number,
): GeofenceLocation {
  const location: GeofenceLocation = {
    segmentName: 'Unknown',
    categoryLocation: 'Unknown',
    origFid: 0,
    isInside: false,
  };

  if (!geojsonRaw) return location;

  const geojson =
    typeof geojsonRaw === 'string' ? JSON.parse(geojsonRaw) : geojsonRaw;
  // Turf mendeteksi [longitude, latitude]
  const pt = turf.point([longitude, latitude]);

  turf.featureEach(geojson as Feature | FeatureCollection, (feature) => {
    if (
      feature.geometry &&
      (feature.geometry.type === 'Polygon' ||
        feature.geometry.type === 'MultiPolygon') &&
      turf.booleanPointInPolygon(pt, feature as Feature<Polygon | MultiPolygon>)
    ) {
      location.isInside = true;
      location.segmentName = feature.properties?.Segment || 'No Segment Name';
      location.categoryLocation = feature.properties?.Category || 'No Category';
      location.origFid = Number(feature.properties?.ORIG_FID) || 0;
    }
  });

  return location;
}
