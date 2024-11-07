import Shape from './Shape';

export default class Dot extends Shape {
    public type = 3
    public color = '' // 智能标注（SAM）时，green左键加点，red右键加点，''表示关键点（非智能标注点）
    constructor(item: any, index: number) {
        super(item, index)
        this.color = item.color || this.color
    }
}
