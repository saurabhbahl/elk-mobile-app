export const territoryLabelFeature: GeoJSON.FeatureCollection<GeoJSON.Point> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Elk County' },
      geometry: { type: 'Point', coordinates: [-78.65, 41.43] },
    },
    {
      type: 'Feature',
      properties: { name: 'Cameron County' },
      geometry: { type: 'Point', coordinates: [-78.20, 41.43] },
    },
    {
      type: 'Feature',
      properties: { name: 'Clearfield County' },
      geometry: { type: 'Point', coordinates: [-78.48, 41.00] },
    },
    {
      type: 'Feature',
      properties: { name: 'Clinton County' },
      geometry: { type: 'Point', coordinates: [-77.62, 41.25] },
    },
    {
      type: 'Feature',
      properties: { name: 'Centre County' },
      geometry: { type: 'Point', coordinates: [-77.88, 40.92] },
    },
  ],
};
