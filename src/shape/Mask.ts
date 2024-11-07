import Shape from './Shape';
interface PromptPoint {
  type: boolean; // true for left click, false for right click
  origPoint: [number, number];
  scaledPoint: [number, number];
}

export default class Mask extends Shape {
  public type = 8
  public maskType = '' //everything || click || reat
  public maskBase64 = ''
  public promptPoints : PromptPoint[] = [];
  constructor(item: any, index: number) {
    super(item, index)
    this.maskType = item.maskType || this.maskType
    this.maskBase64 = item.maskBase64 || this.maskBase64
    this.promptPoints = item.promptPoints || this.promptPoints
  }

}
