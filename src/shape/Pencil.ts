import Shape from "./Shape";

export default class Line extends Shape {
  public type = 9;
  public boundingRect: number[] = [];
  constructor(item: any, index: number) {
    super(item, index);
    this.boundingRect = item.boundingRect || this.boundingRect;
  }
  get ctrlsData() {
    return this.coor.length > 3 ? this.coor : [];
  }
}
