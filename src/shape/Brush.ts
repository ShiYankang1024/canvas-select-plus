import Shape from './Shape';

export default class Brush extends Shape {
  public type = 7
  public iseraser = false
  constructor(item: any, index: number) {
    super(item, index)
    this.iseraser = item.iseraser || this.iseraser
  }

  get ctrlsData() {
    return this.coor.length > 3 ? this.coor : [];
  }
}
