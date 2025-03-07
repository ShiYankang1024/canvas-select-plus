import Shape from "./Shape";

export default class Brush extends Shape {
  public type = 7;
  public brushWidth: number = 1;
  public iseraser = false;
  public boundingRect: number[] = [];
  constructor(item: any, index: number) {
    super(item, index);
    this.iseraser = item.iseraser || this.iseraser;
    this.boundingRect = item.boundingRect || this.boundingRect;
  }

  get ctrlsData() {
    return this.coor.length > 3 ? this.coor : [];
  }
}
