import { Coordinate } from '../data/waypoints';

/**
 * Decodes OSRM polyline6
 */
export function decodePolyline(encoded: string): Coordinate[] {
  const points: Coordinate[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    // OSRM polyline6 uses 6 decimal places
    points.push({ latitude: lat / 1e6, longitude: lng / 1e6 });
  }

  return points;
}

export function toLngLat(coordinate: Coordinate): [number, number] {
  return [coordinate.longitude, coordinate.latitude];
}

export function calcDistance(c1: Coordinate, c2: Coordinate): number {
  const R = 6371e3; // metres
  const phi1 = c1.latitude * Math.PI / 180;
  const phi2 = c2.latitude * Math.PI / 180;
  const dphi = (c2.latitude - c1.latitude) * Math.PI / 180;
  const dlamb = (c2.longitude - c1.longitude) * Math.PI / 180;

  const a = Math.sin(dphi / 2) * Math.sin(dphi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(dlamb / 2) * Math.sin(dlamb / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function findNearestPointIndex(userCoord: Coordinate, lineCoords: [number, number][]): number {
  let minDistance = Infinity;
  let nearestIndex = 0;

  for (let i = 0; i < lineCoords.length; i++) {
    const distance = calcDistance(userCoord, { latitude: lineCoords[i][1], longitude: lineCoords[i][0] });
    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = i;
    }
  }

  return nearestIndex;
}

export function createLineFeature(coordinates: Coordinate[]): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coordinates.map(toLngLat),
        },
      },
    ],
  };
}
export function calculateBearing(start: Coordinate, end: Coordinate): number {
  const startLat = (start.latitude * Math.PI) / 180;
  const startLng = (start.longitude * Math.PI) / 180;
  const endLat = (end.latitude * Math.PI) / 180;
  const endLng = (end.longitude * Math.PI) / 180;

  const y = Math.sin(endLng - startLng) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) -
            Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

export function getTurnInstruction(bearing1: number, bearing2: number): { text: string; icon: any } {
  let diff = bearing2 - bearing1;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  if (Math.abs(diff) < 25) return { text: 'Continue Straight', icon: 'navigation' };
  if (diff > 25 && diff < 65) return { text: 'Turn Slight Right', icon: 'navigation' };
  if (diff >= 65 && diff < 115) return { text: 'Turn Right', icon: 'navigation' };
  if (diff >= 115) return { text: 'Sharp Right Turn', icon: 'navigation' };
  if (diff < -25 && diff > -65) return { text: 'Turn Slight Left', icon: 'navigation' };
  if (diff <= -65 && diff > -115) return { text: 'Turn Left', icon: 'navigation' };
  if (diff <= -115) return { text: 'Sharp Left Turn', icon: 'navigation' };
  
  return { text: 'Continue Straight', icon: 'straight' };
}
