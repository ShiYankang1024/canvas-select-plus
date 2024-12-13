import Shape from './Shape';
interface MagicPoint {
  coor: [number, number];
  color: string;
}

export default class Mask extends Shape {
  public type = 8
  public maskType = '' //everything || click || reat
  public maskBase64 = ''
  public pixels :number[] = []
  public canvasData :ImageData = null 
  // public rectcoor = ''
  public height = 0
  public weight = 0
  public maskToPolygon = false
  public magicPoints : MagicPoint[] = []
  constructor(item: any, index: number) {
    super(item, index)
    this.maskType = item.maskType || ''
    this.maskBase64 = item.maskBase64 || ''
    this.pixels = item.pixels || []
    this.canvasData = item.canvasData || null
    this.height = item.height || 0
    this.weight = item.weight || 0
    // this.rectcoor = item.rectcoor || this.rectcoor
    this.maskToPolygon = item.maskToPolygon || false
    this.magicPoints = item.magicPoints || []
  }

}
