declare module 'react-native-maps' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  export interface MapViewProps extends ViewProps {
    initialRegion?: {
      latitude: number;
      longitude: number;
      latitudeDelta: number;
      longitudeDelta: number;
    };
    showsUserLocation?: boolean;
  }

  export default class MapView extends Component<MapViewProps> {}

  export class Marker extends Component<Record<string, unknown>> {}
  export class Polyline extends Component<Record<string, unknown>> {}
}
