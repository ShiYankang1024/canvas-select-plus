import Shape from './Shape';

export default class Brush extends Shape {
  public type = 7
  constructor(item: any, index: number) {
    super(item, index)
  }

  get ctrlsData() {
    return this.coor.length > 3 ? this.coor : [];
  }
}
