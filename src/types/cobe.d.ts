declare module "cobe" {
  type GlobeOptions = {
    devicePixelRatio?: number;
    width: number;
    height: number;
    phi?: number;
    theta?: number;
    dark?: number;
    diffuse?: number;
    mapSamples?: number;
    mapBrightness?: number;
    baseColor?: [number, number, number];
    markerColor?: [number, number, number];
    glowColor?: [number, number, number];
    markerElevation?: number;
    markers?: Array<{
      location: [number, number];
      size: number;
      id?: string;
    }>;
    arcs?: Array<{
      from: [number, number];
      to: [number, number];
      id?: string;
    }>;
    arcColor?: [number, number, number];
    arcWidth?: number;
    arcHeight?: number;
    opacity?: number;
  };

  type GlobeInstance = {
    update: (options: Partial<GlobeOptions>) => void;
    destroy: () => void;
  };

  export default function createGlobe(
    canvas: HTMLCanvasElement,
    options: GlobeOptions
  ): GlobeInstance;
}
