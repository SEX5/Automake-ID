declare module 'smartcrop' {
  export interface CropOptions {
    width: number;
    height: number;
    minScale?: number;
    boost?: Array<{ x: number; y: number; width: number; height: number; weight: number }>;
    ruleOfThirds?: boolean;
  }

  export interface CropResult {
    topCrop: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    crops: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      score: {
        detail: number;
        saturation: number;
        skin: number;
        total: number;
      };
    }>;
  }

  export function crop(
    image: HTMLImageElement | HTMLCanvasElement,
    options: CropOptions
  ): Promise<CropResult>;

  const smartcrop: {
    crop: typeof crop;
  };

  export default smartcrop;
}
