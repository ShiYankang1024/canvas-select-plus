import Shape from "./Shape";

export default class BrushMask extends Shape {
  public type = 10;
  public encodePixelData: number[] = [];
  public startPoint: [number, number] = [0, 0];
  public width = 0;
  public height = 0;
  constructor(item: any, index: number) {
    super(item, index);
    this.encodePixelData = item.encodePixelData || [];
    this.startPoint = item.startPoint || [0, 0];
    this.width = item.width || 0;
    this.height = item.height || 0;
  }
}
