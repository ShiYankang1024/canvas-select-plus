import Shape from "./Shape";

export default class Rect extends Shape {
  public type = 1;
  public iscontour = false;
  constructor(item: any, index: number) {
    super(item, index);
    // this.iscontour = item.iscontour || this.iscontour // 智能标注框
    // this.labelType = item.labelType || this.labelType; // 标签文字显示位置
  }
  get ctrlsData() {
    const [[x0, y0], [x1, y1]] = this.coor;
    return [
      [x0, y0],
      [x0 + (x1 - x0) / 2, y0],
      [x1, y0],
      [x1, y0 + (y1 - y0) / 2],
      [x1, y1],
      [x0 + (x1 - x0) / 2, y1],
      [x0, y1],
      [x0, y0 + (y1 - y0) / 2]
    ];
  }
}
