import Shape from "./Shape";

export default class Line extends Shape {
  public type = 9;
  public boundingRect: number[] = [];
  // public outerCoor: any[] = [];
  // public innerCoor: any[][] = [];
  constructor(item: any, index: number) {
    super(item, index);
    this.boundingRect = item.boundingRect || this.boundingRect;
    // this.outerCoor = item.outerCoor || this.outerCoor;
    // this.innerCoor = item.innerCoor || this.innerCoor;
  }
  get ctrlsData() {
    return this.coor.length > 3 ? this.coor : [];
  }
}
