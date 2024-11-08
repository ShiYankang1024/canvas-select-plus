import Rect from './shape/Rect';
import Polygon from './shape/Polygon';
import Dot from './shape/Dot';
import EventBus from './EventBus';
import Line from './shape/Line';
import Circle from './shape/Circle';
import Grid from './shape/Grid';
import Brush from './shape/Brush';
import Mask from './shape/Mask';
import pkg from '../package.json';
import { isNested, createUuid, deepClone, deepEqual } from "./tools";

export type Point = [number, number];
export type AllShape = Rect | Polygon | Dot | Line | Circle | Grid | Mask;
enum Shape {
    None,
    Rect,
    Polygon,
    Dot,
    Line,
    Circle,
    Grid,
    Brush,
    Mask
}
interface MagicPoint {
    type: boolean;
    origPoint: [number, number];
    scaledPoint: [number, number];
};
interface Prompt {
    origPoint: [number, number];
    scaledPoint: [number, number];
    type?: boolean;
}
export default class CanvasSelect extends EventBus {
    /** 当前版本 */
    version = pkg.version;
    /** 只读模式，画布不允许任何交互 */
    lock: boolean = false;
    /** 只读模式，仅支持查看 */
    readonly: boolean = false;
    /** 最小矩形宽度 */
    MIN_WIDTH = 10;
    /** 最小矩形高度 */
    MIN_HEIGHT = 10;
    /** 最小圆形半径 */
    MIN_RADIUS = 5;
    /** 最小轨迹点数 */
    MIN_POINTNUM = 3;
    /** 边线颜色 */
    strokeStyle = '#0f0';
    /** 填充颜色 */
    fillStyle = 'rgba(0, 0, 255, 0.1)';
    /** 边线宽度 */
    lineWidth = 2;
    /** 当前选中的标注边线颜色 */
    activeStrokeStyle = 'rgba(0, 0, 255, 1)';
    /** 当前选中的标注填充颜色 */
    activeFillStyle = 'rgba(0, 0, 255, 0.5)';
    /** 控制点边线颜色 */
    ctrlStrokeStyle = '#000';
    /** 控制点填充颜色 */
    ctrlFillStyle = '#fff';
    /** 控制点半径 */
    ctrlRadius = 3;
    /** 是否隐藏标签 */
    hideLabel = false;
    /** 标签背景填充颜色 */
    labelFillStyle = 'rgba(255, 255, 255, 0.5)';
    /** 标签字体 */
    labelFont = '12px sans-serif';
    /** 标签文字颜色 */
    textFillStyle = '#FFFFFF';
    /** 标签字符最大长度，超出使用省略号 */
    labelMaxLen = 10;
    /** 画布宽度 */
    WIDTH = 0;
    /** 画布高度 */
    HEIGHT = 0;
    /** 背景图src */
    imagesrc = '';
    imagealpha = 1;


    canvas: HTMLCanvasElement;

    ctx: CanvasRenderingContext2D;
    /** 变化前的所有标注数据 */
    olddataset: AllShape[] = [];
    /** 所有标注数据 */
    dataset: AllShape[] = [];

    // 保存一次完成的修改后的记录(触发按钮事件或鼠标抬起)
    doneList: AllShape[][] = [];

    // 保存撤销的记录
    undoList: AllShape[][] = [];

    /** 记录所有隐藏图形的uuid*/
    hideList: string[] = [];

    /** 记录brush的轨迹*/
    drawingHistory: string[] = [];

    offScreen: HTMLCanvasElement;

    offScreenCtx: CanvasRenderingContext2D;
    /** 记录锚点距离 */
    remmber: number[][];
    /** 记录鼠标位置 */
    mouse: Point;
    /** 记录背景图鼠标位移 */
    remmberOrigin: number[] = [0, 0];
    /** 0 不创建，1 矩形，2 多边形，3 点，4 折线，5 圆，6 网格, 7 刷子brush, 8 橡皮擦 */
    createType: Shape = Shape.None; //
    /** 控制点索引 */
    ctrlIndex = -1;
    /** 背景图片 */
    image: HTMLImageElement = new Image();
    /** 图片原始宽度 */
    IMAGE_ORIGIN_WIDTH: number;
    /** 图片缩放宽度 */
    IMAGE_WIDTH = 0;
    /** 图片原始高度 */
    IMAGE_ORIGIN_HEIGHT = 0;
    /** 图片缩放高度 */
    IMAGE_HEIGHT = 0;
    /** 原点x */
    originX = 0;
    /** 原点y */
    originY = 0;
    /** 缩放步长 */
    scaleStep = 0;
    /** 滚动缩放 */
    scrollZoom = true;

    private timer: any;
    /** 最小touch双击时间 */
    dblTouch = 300;
    /** 记录touch双击开始时间 */
    dblTouchStore = 0; //
    /** 这个选项可以帮助浏览器进行内部优化 */
    alpha = true;
    /** 专注模式 */
    focusMode = false;
    /** 记录当前事件 */
    private evt: MouseEvent | TouchEvent | KeyboardEvent;
    /** 触控缩放时记录上一次两点距离 */
    scaleTouchStore = 0;
    /** 当前是否为双指触控 */
    isTouch2 = false;
    isMobile = navigator.userAgent.includes('Mobile');
    /** 向上展示label */
    labelUp = false;
    private isCtrlKey = false;
    /** 自定义ctrl快捷键 KeyboardEvent.code */
    ctrlCode = "ControlLeft";
    /** 网格右键菜单 */
    gridMenuEnable = true;
    /** 网格选中背景填充颜色 */
    gridSelectedFillStyle = 'rgba(255, 255, 0, 0.6)';


    /** 记录是否正在使用brush */
    ispainting = false;

    /** 初始化brush线条样式 */
    // brushlineCap = "round";//线段末端为圆形
    // brushlineJoin = "round";//两线段连接处为圆形
    brushlineWidth = 1;
    brushstrokeStyle = "rgba(255, 255, 0)";
    // activebrushstrokeStyle = "#FC5531";

    isEraser = false;
    isErasing = false;

    eraserPoints: [number, number][] = [];
    
    eraserSize = 8;// 橡皮擦的半径

    random_color = [
        { r: 255, g: 0, b: 0 },
        { r: 0, g: 255, b: 0 },
        { r: 0, b: 255, g: 0 }
    ];

    alpha_255 = 192;

    isMagicToolActive = false;

    promptPoints : MagicPoint[] = [];

    lastX = 0;
    lastY = 0;


    /**
     * @param el Valid CSS selector string, or DOM
     * @param src image src
     */
    constructor(el: HTMLCanvasElement | string, src?: string) {
        super();
        this.handleLoad = this.handleLoad.bind(this);
        this.handleContextmenu = this.handleContextmenu.bind(this);
        this.handleMousewheel = this.handleMousewheel.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleDblclick = this.handleDblclick.bind(this);
        this.handleKeyup = this.handleKeyup.bind(this);
        this.handleKeydown = this.handleKeydown.bind(this);
        const container = typeof el === 'string' ? document.querySelector(el) : el;
        if (container instanceof HTMLCanvasElement) {
            this.canvas = container;
            this.offScreen = document.createElement('canvas');
            this.imagesrc = src;
            this.initSetting();
            this.initEvents();
            src && this.setImage(src);
            for (let i = 1; i <= 255; i++) {
                const red = Math.floor(Math.random() * 256);
                const green = Math.floor(Math.random() * 256);
                const blue = Math.floor(Math.random() * 256);
                this.random_color[i] = { r: red, g: green, b: blue };
            }
        } else {
            console.warn('HTMLCanvasElement is required!');
        }
    }

    /** 当前选中的标注 */
    get activeShape() {
        return this.dataset.find(x => x.active) || {} as any;
    }

    /** 当前缩放比例 */
    get scale() {
        if (this.IMAGE_ORIGIN_WIDTH && this.IMAGE_WIDTH) {
            return this.IMAGE_WIDTH / this.IMAGE_ORIGIN_WIDTH;
        }
        return 1;
    }

    /** 图片最小边尺寸 */
    get imageMin() {
        return Math.min(this.IMAGE_WIDTH, this.IMAGE_HEIGHT);
    }

    /** 图片原始最大边尺寸 */
    get imageOriginMax() {
        return Math.max(this.IMAGE_ORIGIN_WIDTH, this.IMAGE_ORIGIN_HEIGHT);
    }

    /** 合成事件 */
    private mergeEvent(e: TouchEvent | MouseEvent) {
        let mouseX = 0;
        let mouseY = 0;
        let mouseCX = 0;
        let mouseCY = 0;
        if (this.isMobile) {
            const { clientX, clientY } = (e as TouchEvent).touches[0];
            const target = e.target as HTMLCanvasElement;
            const { left, top } = target.getBoundingClientRect();
            mouseX = Math.round(clientX - left);
            mouseY = Math.round(clientY - top);
            if ((e as TouchEvent).touches.length === 2) {
                const { clientX: clientX1 = 0, clientY: clientY1 = 0 } = (e as TouchEvent).touches[1] || {};
                mouseCX = Math.round(Math.abs((clientX1 - clientX) / 2 + clientX) - left);
                mouseCY = Math.round(Math.abs((clientY1 - clientY) / 2 + clientY) - top);
            }
        } else {
            mouseX = (e as MouseEvent).offsetX;
            mouseY = (e as MouseEvent).offsetY;
        }
        return { ...e, mouseX, mouseY, mouseCX, mouseCY };
    }

    private handleLoad() {
        this.emit('load', this.image.src);
        this.IMAGE_ORIGIN_WIDTH = this.IMAGE_WIDTH = this.image.width;
        this.IMAGE_ORIGIN_HEIGHT = this.IMAGE_HEIGHT = this.image.height;
        this.fitZoom();
    }

    private handleContextmenu(e: MouseEvent) {
        e.preventDefault();
        this.evt = e;
        if (this.lock) return;
    }

    private handleMousewheel(e: WheelEvent) {
        e.stopPropagation();
        this.evt = e;
        if (this.lock || !this.scrollZoom) return;
        const { mouseX, mouseY } = this.mergeEvent(e);
        this.mouse = [mouseX, mouseY];
        this.setScale(e.deltaY < 0, true);
    }

    private handleMouseDown(e: MouseEvent | TouchEvent) {
        e.stopPropagation();
        this.evt = e;
        if (this.lock) return;
        const { mouseX, mouseY, mouseCX, mouseCY } = this.mergeEvent(e);
        const offsetX = Math.round(mouseX / this.scale);
        const offsetY = Math.round(mouseY / this.scale);
        this.mouse = this.isMobile && (e as TouchEvent).touches.length === 2 ? [mouseCX, mouseCY] : [mouseX, mouseY];
        this.remmberOrigin = [mouseX - this.originX, mouseY - this.originY];
        // 记录变化前的数据
        this.olddataset = deepClone(this.dataset);
        if ((!this.isMobile && (e as MouseEvent).buttons === 1) || (this.isMobile && (e as TouchEvent).touches.length === 1)) { // 鼠标左键
            const ctrls = this.activeShape.ctrlsData || [];
            this.ctrlIndex = ctrls.findIndex((coor: Point) => this.isPointInCircle(this.mouse, coor, this.ctrlRadius));
            if (this.ctrlIndex > -1 && !this.readonly) { // 点击到控制点
                console.log("this.ctrlIndex", this.ctrlIndex)
                const [x0, y0] = ctrls[this.ctrlIndex];
                if (this.activeShape.type === Shape.Polygon && this.activeShape.coor.length > 2 && this.ctrlIndex === 0) {
                    this.handleDblclick(e)
                }
                this.remmber = [[offsetX - x0, offsetY - y0]];
            } else if (this.isInBackground(e)) {
                if (this.activeShape.creating && !this.readonly) { // 创建中
                    if ([Shape.Polygon, Shape.Line].includes(this.activeShape.type)) {
                        const [x, y] = this.activeShape.coor[this.activeShape.coor.length - 1];
                        if (x !== offsetX && y !== offsetY) {
                            const nx = Math.round(offsetX - this.originX / this.scale);
                            const ny = Math.round(offsetY - this.originY / this.scale);
                            this.activeShape.coor.push([nx, ny]);
                        }
                    }
                } else if (this.createType !== Shape.None && !this.readonly && !this.isCtrlKey) { // 开始创建
                    let newShape;
                    const nx = Math.round(offsetX - this.originX / this.scale);
                    const ny = Math.round(offsetY - this.originY / this.scale);
                    const curPoint: Point = [nx, ny];
                    switch (this.createType) {
                        case Shape.Rect:
                            newShape = new Rect({ coor: [curPoint, curPoint] }, this.dataset.length);
                            newShape.creating = true;
                            break;
                        case Shape.Polygon:
                            newShape = new Polygon({ coor: [curPoint] }, this.dataset.length);
                            newShape.creating = true;
                            break;
                        case Shape.Dot:
                            newShape = new Dot({ coor: curPoint }, this.dataset.length);
                            this.emit('add', newShape);
                            break;
                        case Shape.Line:
                            newShape = new Line({ coor: [curPoint] }, this.dataset.length);
                            newShape.creating = true;
                            break;
                        case Shape.Circle:
                            newShape = new Circle({ coor: curPoint }, this.dataset.length);
                            newShape.creating = true;
                            break;
                        case Shape.Grid:
                            newShape = new Grid({ coor: [curPoint, curPoint] }, this.dataset.length);
                            newShape.creating = true;
                            break;
                        case Shape.Brush:
                            newShape = new Brush({ coor: [curPoint] }, this.dataset.length);
                            newShape.creating = true;
                            newShape.lineWidth = this.brushlineWidth;
                            newShape.strokeStyle = this.brushstrokeStyle;
                            this.ispainting = true;
                            if (this.isEraser) {
                                newShape.iseraser = true;
                                // this.ctx.save();
                                // this.ctx.globalCompositeOperation = 'destination-out';
                                // this.ctx.beginPath();
                                // this.ctx.arc(this.mouse[0], this.mouse[1], this.brushlineWidth / 2, 0, Math.PI * 2);
                                // this.ctx.fill();
                                // this.ctx.restore();
                                // this.lastX = this.mouse[0];
                                // this.lastY = this.mouse[1];
                            } 
                            break;
                        default:
                            break;
                    }
                    this.dataset.forEach((sp) => { sp.active = false; });
                    newShape.active = true;
                    this.dataset.push(newShape);
                } else {
                    // 是否点击到形状
                    const [hitShapeIndex, hitShape] = this.hitOnShape(this.mouse);
                    if (hitShapeIndex > -1) {
                        if(hitShape.type === Shape.Dot && ('color' in hitShape) && hitShape.color !== ''){
                            return; // 智能标注生成的点不可被选中
                        }
                        if(hitShape.type === Shape.Brush){
                            this.emit('select', hitShape);
                            return; // 刷子和橡皮檫轨迹不可被拖拽
                        }
                        hitShape.dragging = true;
                        this.dataset.forEach((item, i) => item.active = i === hitShapeIndex);
                        this.dataset.splice(hitShapeIndex, 1, hitShape);
                        // this.dataset.push(hitShape);
                        if (!this.readonly) {
                            this.remmber = [];
                            if ([Shape.Dot, Shape.Circle].includes(hitShape.type)) {
                                const [x, y] = hitShape.coor;
                                this.remmber = [[offsetX - x, offsetY - y]];
                            } else {
                                hitShape.coor.forEach((pt: any) => {
                                    this.remmber.push([offsetX - pt[0], offsetY - pt[1]]);
                                });
                            }
                        }
                        this.emit('select', hitShape);
                    } else {
                        this.activeShape.active = false;
                        this.dataset.sort((a, b) => a.index - b.index);
                        this.emit('select', null);
                    }
                }
                this.update();
            }
        } else if ((!this.isMobile && (e as MouseEvent).buttons === 2) || (this.isMobile && (e as TouchEvent).touches.length === 3) && !this.readonly) { // 鼠标右键
            if ([Shape.Grid].includes(this.activeShape.type) && this.gridMenuEnable) {
                const rowCol = prompt('x 行 y 列 x,y', [this.activeShape.row, this.activeShape.col].join(','));
                if (typeof rowCol === 'string') {
                    const [row, col] = rowCol.split(',');
                    if (/^[1-9]\d*$/.test(row) && /^[1-9]\d*$/.test(col)) {
                        this.activeShape.row = Number(row);
                        this.activeShape.col = Number(col);
                        this.update();
                    }
                }

            }
            this.emit('contextmenu', e);
        }
    }

    private handleMouseMove(e: MouseEvent | TouchEvent) {
        e.stopPropagation();
        this.evt = e;
        if (this.lock) return;
        const { mouseX, mouseY, mouseCX, mouseCY } = this.mergeEvent(e);
        const offsetX = Math.round(mouseX / this.scale);
        const offsetY = Math.round(mouseY / this.scale);
        this.mouse = this.isMobile && (e as TouchEvent).touches.length === 2 ? [mouseCX, mouseCY] : [mouseX, mouseY];
        if (((!this.isMobile && (e as MouseEvent).buttons === 1) || (this.isMobile && (e as TouchEvent).touches.length === 1)) && this.activeShape.type) {
            if (this.ctrlIndex > -1 && this.remmber.length && (this.isInBackground(e) || this.activeShape.type === Shape.Circle)) {
                const [[x, y]] = this.remmber;
                // resize矩形
                if ([Shape.Rect, Shape.Grid].includes(this.activeShape.type)) {
                    const [[x0, y0], [x1, y1]] = this.activeShape.coor;
                    let coor: Point[] = [];
                    switch (this.ctrlIndex) {
                        case 0:
                            coor = [[offsetX - x, offsetY - y], [x1, y1]];
                            break;
                        case 1:
                            coor = [[x0, offsetY - y], [x1, y1]];
                            break;
                        case 2:
                            coor = [[x0, offsetY - y], [offsetX - x, y1]];
                            break;
                        case 3:
                            coor = [[x0, y0], [offsetX - x, y1]];
                            break;
                        case 4:
                            coor = [[x0, y0], [offsetX - x, offsetY - y]];
                            break;
                        case 5:
                            coor = [[x0, y0], [x1, offsetY - y]];
                            break;
                        case 6:
                            coor = [[offsetX - x, y0], [x1, offsetY - y]];
                            break;
                        case 7:
                            coor = [[offsetX - x, y0], [x1, y1]];
                            break;
                        default:
                            break;
                    }
                    let [[a0, b0], [a1, b1]] = coor;
                    if (
                        a0 < 0 ||
                        a1 < 0 ||
                        b0 < 0 ||
                        b1 < 0 ||
                        a1 > this.IMAGE_ORIGIN_WIDTH ||
                        b1 > this.IMAGE_ORIGIN_HEIGHT
                    ) {
                        // 偶然触发 超出边界处理
                        a0 < 0 && (a0 = 0);
                        a1 < 0 && (a1 = 0);
                        b0 < 0 && (b0 = 0);
                        b1 < 0 && (b1 = 0);
                        if (a1 > this.IMAGE_ORIGIN_WIDTH) {
                            a1 = this.IMAGE_ORIGIN_WIDTH;
                        }
                        if (b1 > this.IMAGE_ORIGIN_HEIGHT) {
                            b1 = this.IMAGE_ORIGIN_HEIGHT;
                        }
                    }

                    if (a1 - a0 >= this.MIN_WIDTH && b1 - b0 >= this.MIN_HEIGHT) {
                        this.activeShape.coor = [[a0, b0], [a1, b1]];
                    } else {
                        this.emit('warn', `Width cannot be less than ${this.MIN_WIDTH},Height cannot be less than${this.MIN_HEIGHT}。`);
                    }
                } else if ([Shape.Polygon, Shape.Line].includes(this.activeShape.type)) {
                    const nx = Math.round(offsetX - this.originX / this.scale);
                    const ny = Math.round(offsetY - this.originY / this.scale);
                    const newPoint = [nx, ny];
                    this.activeShape.coor.splice(this.ctrlIndex, 1, newPoint); // 修改点坐标
                }else if (this.activeShape.type === Shape.Circle) {
                    const nx = Math.round(offsetX - this.originX / this.scale);
                    const newRadius = nx - this.activeShape.coor[0];
                    if (newRadius >= this.MIN_RADIUS) this.activeShape.radius = newRadius;
                }
            } else if (this.activeShape.dragging && !this.readonly) { // 拖拽
                let coor = [];
                let noLimit = true;
                const w = this.IMAGE_ORIGIN_WIDTH || this.WIDTH;
                const h = this.IMAGE_ORIGIN_HEIGHT || this.HEIGHT;
                if ([Shape.Dot, Shape.Circle].includes(this.activeShape.type)) {
                    const [t1, t2] = this.remmber[0];
                    const x = offsetX - t1;
                    const y = offsetY - t2;
                    if (x < 0 || x > w || y < 0 || y > h) noLimit = false;
                    coor = [x, y];
                } else {
                    for (let i = 0; i < this.activeShape.coor.length; i++) {
                        const tar = this.remmber[i];
                        const x = offsetX - tar[0];
                        const y = offsetY - tar[1];
                        if (x < 0 || x > w || y < 0 || y > h) noLimit = false;
                        coor.push([x, y]);
                    }
                }
                if (noLimit) this.activeShape.coor = coor;
            } else if (this.activeShape.creating && this.isInBackground(e)) {
                const x = Math.round(offsetX - this.originX / this.scale);
                const y = Math.round(offsetY - this.originY / this.scale);
                // 创建矩形
                if ([Shape.Rect, Shape.Grid].includes(this.activeShape.type)) {
                    this.activeShape.coor.splice(1, 1, [x, y]);
                } else if (this.activeShape.type === Shape.Circle) {
                    const [x0, y0] = this.activeShape.coor;
                    const r = Math.sqrt((x0 - x) ** 2 + (y0 - y) ** 2);
                    this.activeShape.radius = r;
                } else if(this.ispainting && this.createType === Shape.Brush){
                    const nx = Math.round(offsetX - this.originX / this.scale);
                    const ny = Math.round(offsetY - this.originY / this.scale);
                    const newPoint: Point = [nx, ny];
                    this.activeShape.coor.push(newPoint);
                }
                // else if(this.ispainting && this.createType === Shape.Brush){
                //     this.ctx.lineWidth = this.brushlineWidth;
                //     this.ctx.strokeStyle = this.brushstrokeStyle;
                //     this.ctx.lineTo(this.mouse[0], this.mouse[1]); // 使用直线连接子路径的终点到 x，y 坐标的方法（并不会真正地绘制）
                //     // this.ctx.fill();
                //     this.ctx.stroke(); // 根据当前的画线样式，绘制当前或已经存在的路径的方法
                // } 
            } 
            // else {
            //     if (this.isInBackground(e) && this.isEraser && this.isErasing) {
            //         this.ctx.save();
            //         this.ctx.lineWidth = this.brushlineWidth;
            //         this.ctx.globalCompositeOperation = 'destination-out';
            //         this.ctx.beginPath();
            //         this.ctx.moveTo(this.lastX, this.lastY);
            //         this.ctx.lineTo(this.mouse[0], this.mouse[1]);
            //         this.ctx.stroke();
            //         this.ctx.beginPath();
            //         this.ctx.arc(this.mouse[0], this.mouse[1], this.brushlineWidth / 2, 0, Math.PI * 2);
            //         this.ctx.fill();
            //         this.lastX = this.mouse[0];
            //         this.lastY = this.mouse[1];
            //         return;
            //     }
            // }
            this.update();
        } else if ([Shape.Polygon, Shape.Line, Shape.Brush].includes(this.activeShape.type) && this.activeShape.creating) {
            // 多边形添加点
            this.update();
        } else if ((!this.isMobile && (e as MouseEvent).buttons === 2 && (e as MouseEvent).which === 3) || (this.isMobile && (e as TouchEvent).touches.length === 1 && !this.isTouch2)) {
            // 拖动背景
            this.originX = Math.round(mouseX - this.remmberOrigin[0]);
            this.originY = Math.round(mouseY - this.remmberOrigin[1]);
            this.emit('dragimg');
            this.update();
        } else if (this.isMobile && (e as TouchEvent).touches.length === 2) {
            this.isTouch2 = true;
            const touch0 = (e as TouchEvent).touches[0];
            const touch1 = (e as TouchEvent).touches[1];
            const cur = this.scaleTouchStore;
            this.scaleTouchStore = Math.abs((touch1.clientX - touch0.clientX) * (touch1.clientY - touch0.clientY));
            this.setScale(this.scaleTouchStore > cur, true);
        }
        
    }

    private handleMouseUp(e: MouseEvent | TouchEvent) {
        e.stopPropagation();
        this.evt = e;
        if (this.lock) return;
        if (this.isMobile) {
            if ((e as TouchEvent).touches.length === 0) {
                this.isTouch2 = false;
            }
            if ((Date.now() - this.dblTouchStore) < this.dblTouch) {
                this.handleDblclick(e);
                return;
            }
            this.dblTouchStore = Date.now();
        }
        this.remmber = [];
        if (this.activeShape.type !== Shape.None && !this.isCtrlKey) {
            this.activeShape.dragging = false;
            if (this.activeShape.creating) {
                if ([Shape.Rect, Shape.Grid].includes(this.activeShape.type)) {
                    const [[x0, y0], [x1, y1]] = this.activeShape.coor;
                    if (Math.abs(x0 - x1) < this.MIN_WIDTH || Math.abs(y0 - y1) < this.MIN_HEIGHT) {
                        this.dataset.pop();
                        this.emit('warn', `Width cannot be less than ${this.MIN_WIDTH},Height cannot be less than ${this.MIN_HEIGHT}`);
                    } else {
                        this.activeShape.coor = [[Math.min(x0, x1), Math.min(y0, y1)], [Math.max(x0, x1), Math.max(y0, y1)]];
                        this.activeShape.creating = false;
                        this.emit('add', this.activeShape);
                    }
                } else if (this.activeShape.type === Shape.Circle) {
                    if (this.activeShape.radius < this.MIN_RADIUS) {
                        this.dataset.pop();
                        this.emit('warn', `Radius cannot be less than ${this.MIN_WIDTH}`);
                    } else {
                        this.activeShape.creating = false;
                        this.emit('add', this.activeShape);
                    }
                } else if(this.createType === Shape.Brush){                    
                    if (this.activeShape.coor.length < this.MIN_POINTNUM) {
                        this.dataset.pop();
                        this.emit('warn', `Path points cannot be less than ${this.MIN_POINTNUM}`);
                    } else {
                        this.ispainting = false;
                        this.activeShape.creating = false;
                        // 去除重复点
                        this.activeShape.coor = this.removeDuplicatePoints(this.activeShape.coor);
                        this.emit('add', this.activeShape);
                    }
                }
                this.update();
            }
            const condition = ['coor', 'label', 'labelFont', 'labelUp', 'lineWidth', 'strokeStyle', 'textFillStyle', 'uuid', 'length'];
            console.log(deepEqual(this.olddataset, this.dataset, condition));
            if (!deepEqual(this.olddataset, this.dataset, condition)) {
                this.doneList.push(deepClone(this.dataset));
            }
        } 
        // else {
        //     if(this.isEraser){
        //         this.ctx.globalCompositeOperation = 'source-over';
        //         // this.ctx.globalAlpha = 1.0;
        //         // this.ctx.lineWidth = this.lineWidth;
        //         // this.ctx.fillStyle = this.fillStyle;
        //         // this.ctx.strokeStyle = this.strokeStyle;
        //         this.isErasing = false;
        //     }
        // }
    }

    private handleDblclick(e: MouseEvent | TouchEvent) {
        e.stopPropagation();
        this.evt = e;
        if (this.lock) return;
        if ([Shape.Polygon, Shape.Line].includes(this.activeShape.type)) {
            const canPolygon = this.activeShape.type === Shape.Polygon && this.activeShape.coor.length > 2;
            const canLine = this.activeShape.type === Shape.Line && this.activeShape.coor.length > 1;
            if (canPolygon || canLine) {
                this.emit('add', this.activeShape);
                this.activeShape.creating = false;
                this.update();
            }
        } else if ([Shape.Grid].includes(this.activeShape.type)) { // 双击切换网格分区选中状态
            if (this.activeShape.active) {
                this.activeShape.gridRects.forEach((rect: { coor: Point[]; index: number; }) => {
                    if (this.isPointInRect(this.mouse, rect.coor)) {
                        const thisIndex = this.activeShape.selected.findIndex((x: number) => rect.index === x)
                        if (thisIndex > -1) {
                            this.activeShape.selected.splice(thisIndex, 1);
                        } else {
                            this.activeShape.selected.push(rect.index);
                        }
                    }
                });
                this.update();
            }
        }
    }
    private handleKeydown(e: KeyboardEvent) {
        if (e.code === this.ctrlCode) {
            this.isCtrlKey = true;
        }
    }

    private handleKeyup(e: KeyboardEvent) {
        if (e.code === this.ctrlCode) {
            this.isCtrlKey = false;
        }
        this.evt = e;
        // 检查是否按下了 Ctrl + V
        if (this.isCtrlKey && e.key === 'v' && !this.readonly) {
            this.copyByIndex(this.activeShape.index);
            return; // 直接返回，防止执行后续代码
        }
        if (this.lock || document.activeElement !== document.body || this.readonly) return;
        if (this.activeShape.type) {
            if ([Shape.Polygon, Shape.Line].includes(this.activeShape.type) && e.key === 'Escape') {
                if (this.activeShape.coor.length > 1 && this.activeShape.creating) {
                    this.activeShape.coor.pop();
                } else {
                    this.deleteByIndex(this.activeShape.index);
                }
                this.update();
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                this.deleteByIndex(this.activeShape.index);
            }
        }
    }

    /** 初始化配置 */
    initSetting() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.style.userSelect = 'none';
        this.ctx = this.ctx || this.canvas.getContext('2d', { alpha: this.alpha });
        this.WIDTH = Math.round(this.canvas.clientWidth);
        this.HEIGHT = Math.round(this.canvas.clientHeight);
        this.canvas.width = this.WIDTH * dpr;
        this.canvas.height = this.HEIGHT * dpr;
        this.canvas.style.width = this.WIDTH + 'px';
        this.canvas.style.height = this.HEIGHT + 'px';
        this.offScreen.width = this.WIDTH;
        this.offScreen.height = this.HEIGHT;
        this.offScreenCtx = this.offScreenCtx || this.offScreen.getContext('2d', { willReadFrequently: true });
        this.ctx.scale(dpr, dpr);
    }

    /** 初始化事件 */
    initEvents() {
        this.image.addEventListener('load', this.handleLoad);
        this.canvas.addEventListener('touchstart', this.handleMouseDown);
        this.canvas.addEventListener('touchmove', this.handleMouseMove);
        this.canvas.addEventListener('touchend', this.handleMouseUp);
        this.canvas.addEventListener('contextmenu', this.handleContextmenu);
        this.canvas.addEventListener('mousewheel', this.handleMousewheel);
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('mouseup', this.handleMouseUp);
        this.canvas.addEventListener('dblclick', this.handleDblclick);
        document.body.addEventListener('keydown', this.handleKeydown, true);
        document.body.addEventListener('keyup', this.handleKeyup, true);
    }

    getscaledPoint(e: MouseEvent) : Point {
        const { mouseX, mouseY } = this.mergeEvent(e);
        const offsetX = Math.round(mouseX / this.scale);
        const offsetY = Math.round(mouseY / this.scale);
        const nx = Math.round(offsetX - this.originX / this.scale);
        const ny = Math.round(offsetY - this.originY / this.scale);
        return [nx, ny];
    }

    /**
     * 添加/切换图片
     * @param url 图片链接
     */
    setImage(url: string, alpha: number = 1) {
        // 解决问题：Failed to execute 'toDataURL' on 'HTMLCanvasElement': Tainted canvases may not be exported.
        this.image.crossOrigin = 'Anonymous';
        this.image.src = url;
        this.imagealpha = alpha;
    }

    /**
     * 设置数据
     * @param data Array
     * @param needCreate Boolean 是否需要创建(当传options时需要，当撤销重做操作传dataset时不需要)
     */
    setData(data: AllShape[], needCreate = true) {
        setTimeout(() => {
            if(needCreate) {
                const initdata: AllShape[] = [];
                data.forEach((item, index) => {
                    if (Object.prototype.toString.call(item).includes('Object')) {
                        let shape: AllShape;
                        switch (item.type) {
                            case Shape.Rect:
                                shape = new Rect(item, index);
                                break;
                            case Shape.Polygon:
                                shape = new Polygon(item, index);
                                break;
                            case Shape.Dot:
                                shape = new Dot(item, index);
                                break;
                            case Shape.Line:
                                shape = new Line(item, index);
                                break;
                            case Shape.Circle:
                                shape = new Circle(item, index);
                                break;
                            case Shape.Grid:
                                shape = new Grid(item, index);
                                break;
                            case Shape.Brush:
                                shape = new Brush(item, index);
                                break;
                            case Shape.Mask:
                                shape = new Mask(item, index);
                                break;
                            default:
                                console.warn('Invalid shape', item);
                                break;
                        }
                        [Shape.Rect, Shape.Polygon, Shape.Dot, Shape.Line, Shape.Circle, Shape.Grid, Shape.Brush, Shape.Mask].includes(item.type) && initdata.push(shape);
                    } else {
                        console.warn('Shape must be an enumerable Object.', item);
                    }
                });
                this.dataset = initdata;
            } else {
                this.dataset = data;
            }
            this.update();
            if (this.doneList.length === 0) {
                this.doneList.push(deepClone(this.dataset));
            }
        });
    }

    /**
     * 判断是否在标注实例上
     * @param mousePoint 点击位置
     * @returns
     */
    hitOnShape(mousePoint: Point): [number, AllShape] {
        let hitShapeIndex = -1;
        let hitShape: AllShape;
        for (let i = this.dataset.length - 1; i > -1; i--) {
            const shape = this.dataset[i];
            if (
                (shape.type === Shape.Dot && this.isPointInCircle(mousePoint, shape.coor as Point, this.ctrlRadius)) ||
                (shape.type === Shape.Circle && this.isPointInCircle(mousePoint, shape.coor as Point, (shape as Circle).radius * this.scale)) ||
                (shape.type === Shape.Rect && this.isPointInRect(mousePoint, (shape as Rect).coor)) ||
                (shape.type === Shape.Polygon && this.isPointInPolygon(mousePoint, (shape as Polygon).coor)) ||
                (shape.type === Shape.Line && this.isPointInLine(mousePoint, (shape as Line).coor)) ||
                (shape.type === Shape.Grid && this.isPointInRect(mousePoint, (shape as Grid).coor)) ||
                (shape.type === Shape.Brush && this.isPointInPolygon(mousePoint, (shape as Brush).coor))
            ) {
                if ((this.focusMode && !shape.active) || shape.hiddening) continue;
                hitShapeIndex = i;
                hitShape = shape;
                break;
            }
        }
        return [hitShapeIndex, hitShape];
    }

    /**
     * 判断是否在标注实例边上（仅矩形）
     * @param mousePoint 点击位置
     * @returns
     */
    // hitOnShapeEdge(mousePoint: Point): [number, AllShape, string] {
    //     let hitShapeIndex = -1;
    //     let hitShape: AllShape;
    //     let mouseType: string;
    //     for (let i = this.dataset.length - 1; i > -1; i--) {
    //         const shape = this.dataset[i];
    //         if (
    //             // (shape.type === Shape.Dot && this.isPointInCircle(mousePoint, shape.coor as Point, this.ctrlRadius)) ||
    //             // (shape.type === Shape.Circle && this.isPointInCircle(mousePoint, shape.coor as Point, (shape as Circle).radius * this.scale)) ||
    //             (shape.type === Shape.Rect && this.isPointOnRectEdge(mousePoint, (shape as Rect).coor) !== 'none')
    //             // (shape.type === Shape.Polygon && this.isPointInPolygon(mousePoint, (shape as Polygon).coor)) ||
    //             // (shape.type === Shape.Line && this.isPointInLine(mousePoint, (shape as Line).coor)) ||
    //             // (shape.type === Shape.Grid && this.isPointInRect(mousePoint, (shape as Grid).coor))
    //         ) {
    //             if ((this.focusMode && !shape.active) || shape.hiddening) continue;
    //             hitShapeIndex = i;
    //             hitShape = shape;
    //             mouseType = this.isPointOnRectEdge(mousePoint, (shape as Rect).coor);
    //             break;
    //         }
    //     }
    //     return [hitShapeIndex, hitShape, mouseType];
    // }

    /**
     * 判断是否在标注实例顶点上
     * @param mousePoint 点击位置
     * @returns
     */
    hitOnShapeVertex(): string {
        let mouseType: string;
        const shape = this.activeShape;
        const ctrls = this.activeShape.ctrlsData || [];
        this.ctrlIndex = ctrls.findIndex((coor: Point) => this.isPointInCircle(this.mouse, coor, this.ctrlRadius));
        if (this.ctrlIndex > -1 && !this.readonly && !shape.hiddening) {
            if (shape.type === Shape.Rect) {
                if (this.ctrlIndex === 0) {
                    mouseType = 'nw-resize';
                } else if (this.ctrlIndex === 1) {
                    mouseType = 'ns-resize';
                } else if (this.ctrlIndex === 2) {
                    mouseType = 'ne-resize';
                } else if (this.ctrlIndex === 3) {
                    mouseType = 'ew-resize';
                } else if (this.ctrlIndex === 4) {
                    mouseType = 'se-resize';
                } else if (this.ctrlIndex === 5) {
                    mouseType = 'ns-resize';
                } else if (this.ctrlIndex === 6) {
                    mouseType = 'sw-resize';
                } else {
                    mouseType = 'ew-resize';
                }
            } else if(shape.type === Shape.Brush){
                mouseType = 'move';
            } else {
                mouseType = 'pointer';
            }
        } else {
            mouseType = '';
        }
        return mouseType;
    }


    /**
     * 判断鼠标是否在背景图内部
     * @param e MouseEvent
     * @returns 布尔值
     */
    isInBackground(e: MouseEvent | TouchEvent): boolean {
        const { mouseX, mouseY } = this.mergeEvent(e);
        return mouseX >= this.originX &&
            mouseY >= this.originY &&
            mouseX <= this.originX + this.IMAGE_ORIGIN_WIDTH * this.scale &&
            mouseY <= this.originY + this.IMAGE_ORIGIN_HEIGHT * this.scale;
    }

    /**point
     * 判断点是否在背景图内部
     * @param point Point
     * @returns 布尔值
     */
    isPointInBackground(point: Point): boolean {
        const pointX = point[0];//???????????????
        const pointY = point[1];
        return pointX >= this.originX && pointY >= this.originY &&
            pointX <= this.originX + this.IMAGE_ORIGIN_WIDTH * this.scale &&
            pointY <= this.originY + this.IMAGE_ORIGIN_HEIGHT * this.scale;
    }

    /**
     * 判断是否在矩形内
     * @param point 坐标
     * @param coor 区域坐标
     * @returns 布尔值
     */
    isPointInRect(point: Point, coor: Point[]): boolean {
        const [x, y] = point;
        const [[x0, y0], [x1, y1]] = coor.map((a) => a.map((b) => b * this.scale));
        return x0 + this.originX < x &&
            x < x1 + this.originX &&
            y0 + this.originY < y &&
            y < y1 + this.originY;
    }

    /**
     * 判断点是否在矩形的边上，并区分是在左右边还是上下边
     * @param point 坐标
     * @param coor 区域坐标
     * @returns 字符串，表示对应的鼠标样式，或 'none' 表示不在边上
     */
    isPointOnRectEdge(point: Point, coor: Point[]): string {
        const [x, y] = point;
        const [[x0, y0], [x1, y1]] = coor.map((a) => a.map((b) => b * this.scale));
        const onLeftEdge = x === x0 + this.originX && y >= y0 + this.originY && y <= y1 + this.originY;
        const onRightEdge = x === x1 + this.originX && y >= y0 + this.originY && y <= y1 + this.originY;
        const onTopEdge = y === y0 + this.originY && x >= x0 + this.originX && x <= x1 + this.originX;
        const onBottomEdge = y === y1 + this.originY && x >= x0 + this.originX && x <= x1 + this.originX;
        if (onLeftEdge || onRightEdge) return 'ew-resize';
        if (onTopEdge || onBottomEdge) return 'ns-resize';
        return 'none';
    }


    /**
     * 判断点是否在矩形的顶点上，并区分是在左上、左下、右上还是右下顶点
     * @param point 坐标
     * @param coor 区域坐标
     * @returns 字符串，表示对应的鼠标样式，或 'none' 表示不在顶点上
     */
    isPointOnRectVertex(point: Point, coor: Point[]): string {
        const [x, y] = point;
        const [[x0, y0], [x1, y1]] = coor.map((a) => a.map((b) => b * this.scale));
        const onLeftTopPoint = x === x0 + this.originX && y === y0 + this.originY;
        const onRightBottomEdge = x === x1 + this.originX && y === y1 + this.originY;
        const onRightTopEdge = x === x1 + this.originX && y === y0 + this.originY;
        const onLeftBottomEdge = x === x0 + this.originX && y === y1 + this.originY;
        if (onLeftTopPoint) return 'nw-resize';
        if (onRightBottomEdge) return 'se-resize';
        if (onRightTopEdge) return 'ne-resize';
        if (onLeftBottomEdge) return 'sw-resize';
        return 'none';
    }

    /**
     * 判断是否在多边形内
     * @param point 坐标
     * @param coor 区域坐标
     * @returns 布尔值
     */
    isPointInPolygon(point: Point, coor: Point[]): boolean {
        this.offScreenCtx.save();
        this.offScreenCtx.clearRect(0, 0, this.WIDTH, this.HEIGHT);
        this.offScreenCtx.translate(this.originX, this.originY);
        this.offScreenCtx.beginPath();
        coor.forEach((pt, i) => {
            const [x, y] = pt.map((a) => Math.round(a * this.scale));
            if (i === 0) {
                this.offScreenCtx.moveTo(x, y);
            } else {
                this.offScreenCtx.lineTo(x, y);
            }
        });
        this.offScreenCtx.closePath();
        this.offScreenCtx.fill();
        const areaData = this.offScreenCtx.getImageData(0, 0, this.WIDTH, this.HEIGHT);
        const index = (point[1] - 1) * this.WIDTH * 4 + point[0] * 4;
        this.offScreenCtx.restore();
        return areaData.data[index + 3] !== 0;
    }

    /**
     * 判断是否在多边形顶点上
     * @param point 坐标
     * @param coor 区域坐标
     * @returns 布尔值
     */
    isPointOnPolygonVertex(point: Point, coor: Point[]): boolean {
        // 遍历每个顶点，检查是否和目标点重合
        return coor.some((pt) => {
            const [x, y] = pt.map((a) => Math.round(a * this.scale));
            return x === point[0] + this.originX && y === point[1] + this.originY;
        });
    }

    /**
     * 判断是否在圆内
     * @param point 坐标
     * @param center 圆心
     * @param r 半径
     * @param needScale 是否为圆形点击检测
     * @returns 布尔值
     */
    isPointInCircle(point: Point, center: Point, r: number): boolean {
        const [x, y] = point;
        const [x0, y0] = center.map((a) => a * this.scale);
        const distance = Math.sqrt((x0 + this.originX - x) ** 2 + (y0 + this.originY - y) ** 2);
        return distance <= r;
    }

    /**
     * 判断是否在圆的顶点上
     * @param point 坐标
     * @param center 圆心
     * @param r 半径
     * @returns 布尔值
     */
    isPointOnCircleVertex(point: Point, center: Point, r: number): boolean {
        const [x, y] = point;
        const [x0, y0] = center.map((a) => a * this.scale);
        return x === x0 + this.originX + r && y === y0 + this.originY;
    }

    /**
     * 判断是否在折线内
     * @param point 坐标
     * @param coor 区域坐标
     * @returns 布尔值
     */
    isPointInLine(point: Point, coor: Point[]): boolean {
        this.offScreenCtx.save();
        this.offScreenCtx.clearRect(0, 0, this.WIDTH, this.HEIGHT);
        this.offScreenCtx.translate(this.originX, this.originY);
        this.offScreenCtx.lineWidth = this.lineWidth > 5 ? this.lineWidth : 5;
        this.offScreenCtx.beginPath();
        coor.forEach((pt, i) => {
            const [x, y] = pt.map((a) => Math.round(a * this.scale));
            if (i === 0) {
                this.offScreenCtx.moveTo(x, y);
            } else {
                this.offScreenCtx.lineTo(x, y);
            }
        });
        this.offScreenCtx.stroke();
        const areaData = this.offScreenCtx.getImageData(0, 0, this.WIDTH, this.HEIGHT);
        const index = (point[1] - 1) * this.WIDTH * 4 + point[0] * 4;
        this.offScreenCtx.restore();
        return areaData.data[index + 3] !== 0;
    }

    /**
       * 判断是图形是否属于嵌套关系 (目前只支持矩形和多边形)
       * @param shape1 标注实例
       * @param shape2 标注实例
       * @returns 布尔值
       */
    isNested(shape1: Rect | Polygon, shape2: Rect | Polygon): boolean {
        return isNested(shape1, shape2);
    }

    /**
     * 绘制矩形
     * @param shape 标注实例
     * @returns
     */
    drawRect(shape: Rect, sub?: Record<string, any>) {
        if (shape.coor.length !== 2) return;
        const { strokeStyle, fillStyle, active, creating, coor, lineWidth } = shape;
        const [[x0, y0], [x1, y1]] = coor.map((a: Point) => a.map((b) => Math.round(b * this.scale)));
        this.ctx.save();
        this.ctx.lineWidth = lineWidth || this.lineWidth;
        this.ctx.fillStyle = (active || creating) ? this.activeFillStyle : (fillStyle || this.fillStyle);
        this.ctx.strokeStyle = (active || creating) ? this.activeStrokeStyle : (strokeStyle || this.strokeStyle);
        const w = x1 - x0;
        const h = y1 - y0;
        if (!creating) this.ctx.fillRect(x0, y0, w, h);
        this.ctx.strokeRect(x0, y0, w, h);
        this.ctx.restore();
        let center = [(coor[1][0]+coor[0][0])/2, (coor[1][1]+coor[0][1])/2];
        this.drawLabel(center as Point, shape);
    }

    /**
     * 绘制多边形
     * @param shape 标注实例
     */
    drawPolygon(shape: Polygon) {
        const { strokeStyle, fillStyle, active, creating, coor, lineWidth } = shape;
        this.ctx.save();
        this.ctx.lineJoin = 'round';
        this.ctx.lineWidth = lineWidth || this.lineWidth;
        this.ctx.fillStyle = (active || creating) ? this.activeFillStyle : (fillStyle || this.fillStyle);
        this.ctx.strokeStyle = (active || creating) ? this.activeStrokeStyle : (strokeStyle || this.strokeStyle);
        this.ctx.beginPath();
        coor.forEach((el: Point, i) => {
            const [x, y] = el.map((a) => Math.round(a * this.scale));
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });
        if (creating) {
            const [x, y] = this.mouse || [];
            this.ctx.lineTo(x - this.originX, y - this.originY);
        } else if (coor.length > 2) {
            this.ctx.closePath();
        }
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();
        this.drawLabel(this.calculateCenter(coor), shape);
    }

    /**
     * 绘制点
     * @param shape 标注实例
     */
    drawDot(shape: Dot) {
        if(shape.color===''){
            // 关键点
            const { strokeStyle, fillStyle, active, coor, lineWidth } = shape;
            const [x, y] = coor.map((a) => a * this.scale);
            this.ctx.save();
            this.ctx.lineWidth = lineWidth || this.lineWidth;
            this.ctx.fillStyle = active ? this.activeFillStyle : (fillStyle || this.ctrlFillStyle);
            this.ctx.strokeStyle = active ? this.activeStrokeStyle : (strokeStyle || this.strokeStyle);
            this.ctx.beginPath();
            this.ctx.arc(x, y, this.ctrlRadius, 0, 2 * Math.PI, true);
            this.ctx.fill();
            this.ctx.arc(x, y, this.ctrlRadius, 0, 2 * Math.PI, true);
            this.ctx.stroke();
            this.ctx.restore();
            this.drawLabel(coor as Point, shape);
        } else {
            // 智能标注点（SAM）
            const { color, coor } = shape;
            const [x, y] = coor.map((a) => a * this.scale);
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, 0.75)`;
            this.ctx.fill();
            this.ctx.strokeStyle = color;
            this.ctx.stroke();
        }
    }

    /**
     * 绘制圆
     * @param shape 标注实例
     */
    drawCirle(shape: Circle) {
        const { strokeStyle, fillStyle, active, coor, label, creating, radius, ctrlsData, lineWidth } = shape;
        const [x, y] = coor.map((a) => a * this.scale);
        this.ctx.save();
        this.ctx.lineWidth = lineWidth || this.lineWidth;
        this.ctx.fillStyle = (active || creating) ? this.activeFillStyle : (fillStyle || this.fillStyle);
        this.ctx.strokeStyle = (active || creating) ? this.activeStrokeStyle : (strokeStyle || this.strokeStyle);
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius * this.scale, 0, 2 * Math.PI, true);
        this.ctx.fill();
        this.ctx.arc(x, y, radius * this.scale, 0, 2 * Math.PI, true);
        this.ctx.stroke();
        this.ctx.restore();
        this.drawLabel(shape.coor as Point, shape);
    }

    /**
     * 绘制折线
     * @param shape 标注实例
     */
    drawLine(shape: Line) {
        const { strokeStyle, active, creating, coor, lineWidth } = shape;
        this.ctx.save();
        this.ctx.lineJoin = 'round';
        this.ctx.lineWidth = lineWidth || this.lineWidth;
        this.ctx.strokeStyle = (active || creating) ? this.activeStrokeStyle : (strokeStyle || this.strokeStyle);
        this.ctx.beginPath();
        coor.forEach((el: Point, i) => {
            const [x, y] = el.map((a) => Math.round(a * this.scale));
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });
        if (creating) {
            const [x, y] = this.mouse || [];
            this.ctx.lineTo(x - this.originX, y - this.originY);
        }
        this.ctx.stroke();
        this.ctx.restore();
        this.drawLabel(coor[0], shape);
    }

    hexToRGBA(hex: string, alpha = 0.7) {
        // 去掉 # 号
        let hexCode = hex.replace(/^#/, '');

        // 检查输入的 hex 是否是有效的三位或六位颜色代码
        if (!/^[A-Fa-f0-9]{3}$/.test(hexCode) && !/^[A-Fa-f0-9]{6}$/.test(hexCode)) {
            return hex;
        }

        // 如果是三位颜色代码，扩展为六位
        if (hexCode.length === 3) {
            hexCode = hexCode.split('').map(char => char + char).join('');
        }

        // 将颜色代码拆分为 R, G, B 组件
        const r = parseInt(hexCode.slice(0, 2), 16);  // 提取红色部分
        const g = parseInt(hexCode.slice(2, 4), 16);  // 提取绿色部分
        const b = parseInt(hexCode.slice(4, 6), 16);  // 提取蓝色部分

        // 返回带有透明度的 RGBA 格式颜色
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    rgbaToHex(rgba: string, includeAlpha: boolean = false): string {
        // 去掉 rgba 前后的空格和括号
        rgba = rgba.trim().replace(/\s/g, '');
        const rgbaArray = rgba.match(/(\d{1,3}),(\d{1,3}),(\d{1,3}),?(\d+(\.\d+)?)?/);
    
        if (!rgbaArray) {
            return rgba; // 如果输入不是有效的 rgba 格式，返回原字符串
        }
    
        const r = parseInt(rgbaArray[1], 10);
        const g = parseInt(rgbaArray[2], 10);
        const b = parseInt(rgbaArray[3], 10);
        const a = rgbaArray[4] ? parseFloat(rgbaArray[4]) : 1.0;
    
        // 将 R, G, B 转换为两位的十六进制字符串
        const hexR = r.toString(16).padStart(2, '0');
        const hexG = g.toString(16).padStart(2, '0');
        const hexB = b.toString(16).padStart(2, '0');
    
        if (includeAlpha) {
            // 将透明度转换为两位的十六进制字符串
            const hexA = Math.round(a * 255).toString(16).padStart(2, '0');
            return `#${hexR}${hexG}${hexB}${hexA}`;
        } else {
            return `#${hexR}${hexG}${hexB}`;
        }
    }

    isRGBA(color: string): boolean {
        const rgbaRegex = /^rgba\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3}),\s*(0(\.\d+)?|1(\.0+)?)\)$/;
        return rgbaRegex.test(color);
    }

    removeDuplicatePoints(points: [number, number][]) {
        const seen = new Set();
        const uniquePoints: [number, number][] = [];
        
        points.forEach(point => {
            const key = `${point[0]},${point[1]}`;
            if (!seen.has(key)) {
            seen.add(key);
            uniquePoints.push(point);
            }
        });
        
        return uniquePoints;
    }

    /**
     * 绘制轨迹
     * @param shape 轨迹实例
     */
    drawBrush(shape: Brush) {
        const { strokeStyle, active, creating, coor, lineWidth, iseraser } = shape;
        this.ctx.save();
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
        this.ctx.lineWidth = lineWidth || this.brushlineWidth;
        this.ctx.strokeStyle = (active || creating) ? (strokeStyle || this.brushstrokeStyle) : (strokeStyle || this.brushstrokeStyle);
        this.ctx.fillStyle = (active || creating) ? (strokeStyle || this.brushstrokeStyle) : (strokeStyle || this.brushstrokeStyle);

        // 应用缩放
        this.ctx.scale(this.scale, this.scale);

        if (coor.length > 0) {
            for(let i = 0; i < coor.length; i++){
                this.ctx.beginPath();
                this.ctx.moveTo(coor[i][0], coor[i][1]);
                if(i + 1 < coor.length){
                    this.ctx.lineTo(coor[i+1][0], coor[i+1][1]);
                }
                if(iseraser){
                    this.ctx.globalCompositeOperation = 'destination-out';
                } else {
                    this.ctx.globalCompositeOperation = 'source-over';
                }
                this.ctx.stroke();
                this.ctx.beginPath();
                this.ctx.arc(coor[i][0], coor[i][1], this.ctx.lineWidth / 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        this.ctx.restore();
    }

    // 判断两个点是否接近（是否重叠）
    arePointsClose(p1: Point, p2: Point) {
        const dx = p1[0] - p2[0];
        const dy = p1[1] - p2[1];
        return Math.sqrt(dx * dx + dy * dy) < this.eraserSize;
    }

    // 去除与橡皮擦重叠的点
    removeOverlap(path: Point[], eraserPoint: Point) {
        return path.filter(point => !this.arePointsClose(point, eraserPoint));
    }

    // 橡皮擦模式：在(x, y)处擦除路径上的点
    eraseAtPoint(point: Point) {
        for(let i = 0; i < this.dataset.length; i++){
            if(this.dataset[i].type === Shape.Brush){
                this.dataset[i].coor = this.removeOverlap(this.dataset[i].coor, point);
            }
        }
        this.update(); // 擦除后重绘画布
    }

    /**
     * 绘制网格
     * @param shape 标注实例
     * @returns
     */
    drawGrid(shape: Grid) {
        if (shape.coor.length !== 2) return;
        const { strokeStyle, fillStyle, active, creating, coor, lineWidth } = shape;
        const [[x0, y0], [x1, y1]] = coor.map((a: Point) => a.map((b) => Math.round(b * this.scale)));
        this.ctx.save();
        this.ctx.lineWidth = lineWidth || this.lineWidth;
        this.ctx.fillStyle = (active || creating) ? this.activeFillStyle : (fillStyle || this.fillStyle);
        this.ctx.strokeStyle = (active || creating) ? this.activeStrokeStyle : (strokeStyle || this.strokeStyle);
        shape.gridRects.forEach((rect: Rect, m) => {
            this.drawRect(rect, {
                selectedFillStyle: shape.selectedFillStyle || this.gridSelectedFillStyle,
                isSelected: shape.selected?.includes(m)
            })
        });
        const w = x1 - x0;
        const h = y1 - y0;
        if (!creating) this.ctx.fillRect(x0, y0, w, h);
        this.ctx.strokeRect(x0, y0, w, h);
        this.ctx.restore();
        this.drawLabel(coor[0], shape);
    }

    /**
     * 绘制控制点
     * @param point 坐标
     */
    drawCtrl(point: Point) {
        const [x, y] = point.map((a) => a * this.scale);
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.fillStyle = this.ctrlFillStyle;
        this.ctx.strokeStyle = this.ctrlStrokeStyle;
        this.ctx.arc(x, y, this.ctrlRadius, 0, 2 * Math.PI, true);
        this.ctx.fill();
        this.ctx.arc(x, y, this.ctrlRadius, 0, 2 * Math.PI, true);
        this.ctx.stroke();
        this.ctx.restore();
    }

    /**
     * 绘制控制点列表
     * @param shape 标注实例
     */
    drawCtrlList(shape: Rect | Polygon | Line) {
        shape.ctrlsData.forEach((point, i) => {
            if (shape.type === Shape.Circle) {
                if (i === 1) this.drawCtrl(point);
            } else {
                this.drawCtrl(point);
            }
        });
    }


    // 计算多个坐标的中心位置
    calculateCenter(points: [number, number][]): [number, number] {
        if (points.length === 0) {
            throw new Error('Points array cannot be empty.');
        }
    
        const sum = points.reduce((acc, [x, y]) => {
            acc[0] += x;  // 累加 x 坐标
            acc[1] += y;  // 累加 y 坐标
            return acc;
        }, [0, 0]);
    
        const centerX = sum[0] / points.length;  // 计算平均 x 坐标
        const centerY = sum[1] / points.length;  // 计算平均 y 坐标
    
        return [centerX, centerY] as Point;  // 返回中心坐标
    }

    getImagedataFromImageClass = (image: HTMLImageElement, masktype: string): Uint8ClampedArray | null => {
        // 创建一个临时的 canvas 元素用于处理图像
        const maskCanvas = document.createElement('canvas');
        const maskContext = maskCanvas.getContext('2d', { willReadFrequently: true });

        if (!maskCanvas || !maskContext) {
          console.error("Canvas or context is not initialized");
          return null;
        }

        maskCanvas.width = this.WIDTH;
        maskCanvas.height = this.HEIGHT;
      
        // 将图像绘制到临时 canvas 上
        const tmpCanvas = document.createElement('canvas');
        const tmpContext = tmpCanvas.getContext('2d', { willReadFrequently: true });

        if (!tmpContext) {
            console.error("Temporary canvas context is not initialized");
            return null;
        }

        tmpCanvas.width = this.WIDTH;
        tmpCanvas.height = this.HEIGHT;
        tmpContext.drawImage(image, 0, 0);
      
        let imageData = tmpContext?.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
        let pixelData = imageData?.data;
      
        if (!pixelData) {
          console.error("Failed to retrieve pixel data");
          return null;
        }

        // 获取 maskCanvas 的图像数据
        const imageMask = maskContext.getImageData(0, 0, this.WIDTH, this.HEIGHT);
        const maskData = imageMask.data;

        // 根据 masktype 处理图像数据
        if (masktype === 'everything') {
            for (let i = 0; i < pixelData.length; i += 4) {
                if (pixelData[i] > 0) {
                    const colorIndex = pixelData[i] % this.random_color.length;
                    maskData[i] = this.random_color[colorIndex].r; // red
                    maskData[i + 1] = this.random_color[colorIndex].g; // green
                    maskData[i + 2] = this.random_color[colorIndex].b; // blue
                    maskData[i + 3] = this.alpha_255; // alpha
                }
            }
            maskContext.putImageData(imageMask, 0, 0);
        } else if (masktype === "rect" ) {

        } else if (masktype === "magic") {
            let pixels = [];
            // Get the pixel indices of the mask
            for (let i = 0; i < pixelData.length; i += 4) {
                if (pixelData[i] == 255 && pixelData[i + 1] == 255 && pixelData[i + 2] == 255) {
                    pixels.push(i);
                }
            }
        } else {
            console.error("Unknown mask type");
            return null;
        }

        // 创建一个新的 canvas 元素并绘制缩放后的图像
        const scaledCanvas = document.createElement('canvas');
        const scaledContext = scaledCanvas.getContext('2d', { willReadFrequently: true });

        if (!scaledContext) {
            console.error("Scaled canvas context is not initialized");
            return null;
        }

        scaledCanvas.width = this.IMAGE_WIDTH;
        scaledCanvas.height = this.IMAGE_HEIGHT;
        scaledContext.drawImage(image, 0, 0, this.IMAGE_WIDTH, this.IMAGE_HEIGHT);

        // 获取缩放后的图像数据
        const scaledImageData = scaledContext.getImageData(0, 0, this.IMAGE_WIDTH, this.IMAGE_HEIGHT);
        return scaledImageData.data;
    }

    putDataOnCanvas(thisCanvas: HTMLCanvasElement, pixels: number[]) {
        const thisContext = thisCanvas.getContext("2d", { willReadFrequently: true });
        if (!thisContext) { return; }
        const canvasData = thisContext.getImageData(this.originX, this.originY, this.IMAGE_WIDTH, this.IMAGE_HEIGHT);
        const data = canvasData.data;
        const replacementColor = { r: 147, g: 112, b: 219 };
        
        for (let i = 0; i < pixels.length; i += 1) {
            data[pixels[i]] = replacementColor.r; // red
            data[pixels[i] + 1] = replacementColor.g; // green
            data[pixels[i] + 2] = replacementColor.b; // blue
            data[pixels[i] + 3] = 64; // alpha
        }
        thisContext.putImageData(canvasData, this.originX, this.originY);
    };

    drawPromptPointOnClick = (thisPrompt: Prompt, canvas: HTMLCanvasElement): void => {
        const x = thisPrompt.origPoint[0];
        const y = thisPrompt.origPoint[1];
        
        const fillColor = `rgba(255, 255, 255, 0.75)`;
        const strokeColor = thisPrompt.type ? `green` : `red`;
        
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return;
        
        context.beginPath();
        context.arc(x, y, 3, 0, Math.PI * 2);
        context.fillStyle = fillColor;
        context.fill();
        context.strokeStyle = strokeColor;
        context.stroke();
    };

    /**
     * 绘制Mask
     * @param shape 标注实例
     * @returns
     */
    drawMask(shape: Mask) {
        const maskBase64 = shape.maskBase64;
        // 将 base64 转换为图像
        const maskImage = new Image();
        maskImage.crossOrigin = 'Anonymous';
        maskImage.src = `data:image/png;base64,${maskBase64}`;

        const self = this;

        // 处理图像数据
        maskImage.onload = () => {
            if(shape.maskType === "everything"){
                const pixelData = self.getImagedataFromImageClass(maskImage, "everything");
    
                if (pixelData) {
                    const canvasData = self.ctx.getImageData(self.originX, self.originY, self.IMAGE_WIDTH, self.IMAGE_HEIGHT);
                    const data = canvasData.data;
            
                    // 遍历图像像素并修改对应的颜色
                    for (let i = 0; i < pixelData.length; i += 4) {
                        if (pixelData[i] > 0) {
                            const color = self.random_color[pixelData[i] % self.random_color.length];
                            data[i] = color.r; // red
                            data[i + 1] = color.g; // green
                            data[i + 2] = color.b; // blue
                            data[i + 3] = 192; // alpha
                        }
                    }
            
                    // 更新 canvas 上的图像数据
                    self.ctx.putImageData(canvasData, self.originX, self.originY);
                }
            } else if (shape.maskType === "click"){
                const pixels: number[] = [];
                const pixelData = self.getImagedataFromImageClass(maskImage, "magic");

                if (pixelData) {
                  console.log(pixelData.length);
                  // Get the pixel indices of the mask
                  for (let i = 0; i < pixelData.length; i += 4) {
                    if (pixelData[i] === 255 && pixelData[i + 1] === 255 && pixelData[i + 2] === 255) {
                      pixels.push(i);
                    }
                  }
                  console.log(pixels.length);
        
                  // Step 4: Put magic mask on canvas
                  // redrawPaths(canvasRef.value, drawnPaths);
                  // instance.deleteAllShape();
                  self.putDataOnCanvas(self.canvas, pixels);

                  for (const thisPrompt of shape.promptPoints) {
                    self.drawPromptPointOnClick(thisPrompt, self.canvas);
                  }
        
                  // Step 5: Add the magic mask to drawnPaths array
                //   interactivePaths.push(pixels);
                } else {
                  console.error("Failed to get pixel data from mask image");
                }
            } else {

            }
        };
    }


    /**
     * 绘制label
     * @param point 位置
     * @param label 文本
     */
    drawLabel(point: Point, shape: AllShape) {
        const { label = '', labelFillStyle = '', labelFont = '', textFillStyle = '', hideLabel, labelUp, lineWidth } = shape;
        const isHideLabel = typeof hideLabel === 'boolean' ? hideLabel : this.hideLabel;
        const isLabelUp = typeof labelUp === 'boolean' ? labelUp : this.labelUp;
        const currLineWidth = lineWidth || this.lineWidth;

        if (label.length && !isHideLabel) {
            this.ctx.font = labelFont || this.labelFont;
            const textPaddingLeft = 4;
            const textPaddingTop = 4;
            const newText = label.length < this.labelMaxLen + 1 ? label : `${label.slice(0, this.labelMaxLen)}...`;
            const text = this.ctx.measureText(newText);
            const font = parseInt(this.ctx.font) - 4;
            const labelWidth = text.width + textPaddingLeft * 2;
            const labelHeight = font + textPaddingTop * 2;
            let [x, y] = point.map((a) => a * this.scale);
            // 以point为中心创建label
            if(shape.type===1||shape.type===2||shape.type===5){
                x = (x-(labelWidth)/2*this.scale);
                y = (y-(labelHeight)/2*this.scale);
            }
            const toleft = (this.IMAGE_ORIGIN_WIDTH - point[0]) < labelWidth / this.scale;
            const toTop = (this.IMAGE_ORIGIN_HEIGHT - point[1]) < labelHeight / this.scale;
            const toTop2 = point[1] > labelHeight / this.scale;
            const isup = isLabelUp ? toTop2 : toTop;
            this.ctx.save();

            // 设置矩形样式
            this.ctx.fillStyle = labelFillStyle || this.labelFillStyle;
            
            // 绘制矩形，考虑缩放因子
            const rectX = toleft ? (x - text.width - textPaddingLeft - currLineWidth / 2) : (x + currLineWidth / 2);
            const rectY = isup ? (y - labelHeight - currLineWidth / 2) : (y + currLineWidth / 2);
            const rectWidth = labelWidth * this.scale;
            const rectHeight = labelHeight * this.scale;
            
            this.ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
            
            // 设置文本样式并考虑缩放
            const scaledFontSize = font * this.scale;  // 根据缩放因子调整字体大小
            this.ctx.font = `${scaledFontSize}px sans-serif`;  // 更新字体大小

            this.ctx.fillStyle = textFillStyle || this.textFillStyle;

            // 获取文本的实际宽度，用于居中计算
            const textWidth = this.ctx.measureText(newText).width;

            // 获取文本的实际高度，用于垂直居中计算
            const textMetrics = this.ctx.measureText(newText);
            const textHeight = textMetrics.fontBoundingBoxAscent + textMetrics.fontBoundingBoxDescent;

            // 设置文本的基线对齐方式为中间
            this.ctx.textBaseline = 'top';  // 设置基线为顶部，便于精确控制位置

            // 计算文本的横向和纵向居中位置
            const textX = rectX + (rectWidth - textWidth) / 2;  // 横向居中
            const textY = rectY + (rectHeight - textHeight) / 2;  // 垂直居中，基于矩形的中间位置减去文本高度的一半

            // 绘制居中的文本，考虑缩放
            this.ctx.fillText(newText, textX, textY, rectWidth);

            
            // 恢复上下文
            this.ctx.restore();  
        }
    }

    /**
     * 更新画布
     */
    update() {
        window.cancelAnimationFrame(this.timer);
        this.timer = window.requestAnimationFrame(() => {
            this.ctx.save();
            this.ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);
            this.ctx.translate(this.originX, this.originY); // 位置映射，（0,0）对应着（this.originX, this.originY）
            if (this.IMAGE_WIDTH && this.IMAGE_HEIGHT) {
                this.ctx.globalAlpha = this.imagealpha;
                this.ctx.drawImage(this.image, 0, 0, this.IMAGE_WIDTH, this.IMAGE_HEIGHT);
                this.ctx.globalAlpha = 1.0;
            }
            // 专注模式下，只显示选中图形
            const renderList = this.focusMode ? (this.activeShape.type ? [this.activeShape] : []) : this.dataset;
            for (let i = 0; i < renderList.length; i++) {
                const shape = renderList[i];
                if (shape.hiddening) continue;
                switch (shape.type) {
                    case Shape.Rect:
                        this.drawRect(shape as Rect);
                        break;
                    case Shape.Polygon:
                        this.drawPolygon(shape as Polygon);
                        break;
                    case Shape.Dot:
                        this.drawDot(shape as Dot);
                        break;
                    case Shape.Line:
                        this.drawLine(shape as Line);
                        break;
                    case Shape.Circle:
                        this.drawCirle(shape as Circle);
                        break;
                    case Shape.Grid:
                        this.drawGrid(shape as Grid);
                        break;
                    case Shape.Brush:
                        this.drawBrush(shape as Brush);
                        break;
                    case Shape.Mask:
                        this.drawMask(shape as Mask);
                        break;
                    default:
                        break;
                }
            }
            if ([Shape.Rect, Shape.Polygon, Shape.Line, Shape.Circle, Shape.Grid].includes(this.activeShape.type) && !this.activeShape.hiddening) {
                this.drawCtrlList(this.activeShape);
            }
            this.ctx.restore();
            this.emit('updated', this.dataset);
        });
    }

    /**
     * 隐藏选中的图形
     */
    hideActiveShape(uuid: string) {
        if (uuid) {
            this.hideList.push(uuid);
            for (let i = 0; i < this.dataset.length; i++) {
                if (this.dataset[i].uuid === uuid) {
                    this.dataset[i].hiddening = true;
                    this.dataset[i].dragging = false;
                    this.dataset[i].active = false;
                    break;
                }
            }
            this.update();
            // this.doneList.push(deepClone(this.dataset));
        }
    }

    /**
     * 显示隐藏的图形
     */
    showHiddenShape() {
        if (this.hideList.length) {
            for (let i = 0; i < this.dataset.length; i++) {
                if (this.dataset[i].uuid === this.hideList[this.hideList.length - 1]) {
                    this.dataset[i].hiddening = false;
                    this.dataset[i].active = true;
                } else {
                    this.dataset[i].active = false;
                }
            }
            this.hideList.pop();
            this.update();
            // this.doneList.push(deepClone(this.dataset));
        }
    }


    /**
     * 删除指定矩形
     * @param index number
     */
    deleteByIndex(index: number) {
        const num = this.dataset.findIndex((x) => x.index === index);
        if (num > -1) {
            this.emit('delete', this.dataset[num]);
            this.dataset.splice(num, 1);
            this.dataset.forEach((item, i) => { item.index = i; });
            this.update();
            this.doneList.push(deepClone(this.dataset));
        }
    }


    /**
     * 修改选中图像的标注信息
     * @param tagId string
     * @param label string
     * @param color string
     */
    updateLabelByIndex(index: number, tagId: string, label: string, color: string, properties: string[]) {
        const updateProperties = (item: any) => {
            properties.forEach(prop => {
                if (prop === 'label') {
                    item.label = label;
                } else if (prop === 'tagId') {
                    item.tagId = tagId;
                } else if (prop === 'strokeStyle') {
                    if(item.type === 7 && this.isRGBA(color)){
                        item.strokeStyle = this.rgbaToHex(color);
                    } else {
                        item.strokeStyle = color;
                    }
                } else if (prop === 'textFillStyle') {
                    item.textFillStyle = color;
                } else if (prop === 'fillStyle') {
                    if(item.type === 7 && this.isRGBA(color)){
                        item.fillStyle = this.rgbaToHex(color);
                    } else {
                        item.fillStyle = color;
                    }
                }
            });
        };
    
        if (index !== -1) {
            updateProperties(this.dataset[index]);
        } else {
            if (this.activeShape) {
                updateProperties(this.activeShape);
            }
        }
    
        this.update();
        this.doneList.push(deepClone(this.dataset));
    }
    

    /**
     * 删除画布中创建的所有图形
     * @param index number
     */
    deleteAllShape() {
        this.dataset = [];
        this.update();
        this.doneList.push(deepClone(this.dataset));
    }


    /**
     * 复制指定矩形  水平为x，竖直为y
     * @param index number
     */
    copyByIndex(index: number) {
        const num = this.dataset.findIndex((x) => x.index === index);
        if (num > -1) {
            if (this.activeShape.type === Shape.Rect) {
                const newItem = deepClone(this.dataset[num]); // 深拷贝对象
                const height = newItem.coor[1][1] - newItem.coor[0][1];
                const width = newItem.coor[1][0] - newItem.coor[0][0];
                const [x, y] = this.mouse || [];
                // 鼠标位置未超出图片背景
                if (this.isPointInBackground(this.mouse)) {
                    if (this.isPointInBackground([x + width * this.scale, y + height * this.scale])) {
                        // 如果鼠标区域为左上角，右下角未超出
                        newItem.coor[0] = [(x - this.originX) / this.scale, (y - this.originY) / this.scale];
                        newItem.coor[1] = [(x - this.originX) / this.scale + width, (y - this.originY) / this.scale + height];
                    } else if (this.isPointInBackground([x - width * this.scale, y - height * this.scale])) {
                        // 如果鼠标区域为右下角，左上角未超出
                        newItem.coor[0] = [(x - this.originX) / this.scale - width, (y - this.originY) / this.scale - height];
                        newItem.coor[1] = [(x - this.originX) / this.scale, (y - this.originY) / this.scale];
                    } else if (this.isPointInBackground([x + width * this.scale, y - height * this.scale])) {
                        // 如果鼠标区域为左下角，右上角未超出
                        newItem.coor[0] = [(x - this.originX) / this.scale, (y - this.originY) / this.scale - height];
                        newItem.coor[1] = [(x - this.originX) / this.scale + width, (y - this.originY) / this.scale];
                    } else if (this.isPointInBackground([x - width * this.scale, y + height * this.scale])) {
                        // 如果鼠标区域为右上角，左下角未超出
                        newItem.coor[0] = [(x - this.originX) / this.scale - width, (y - this.originY) / this.scale];
                        newItem.coor[1] = [(x - this.originX) / this.scale, (y - this.originY) / this.scale + height];
                    }
                    else {
                        return;
                    }
                } else {
                    return;
                }
                newItem.uuid = createUuid();
                this.dataset.push(newItem); // 添加到 dataset 中
                this.dataset[num].active = false;
                this.dataset.forEach((item, i) => { item.index = i; });
                this.update();
                this.doneList.push(deepClone(this.dataset));
            } else if (this.activeShape.type === Shape.Dot) {
                const newItem = deepClone(this.dataset[num]);
                const [x, y] = this.mouse || [];
                if (this.isPointInBackground(this.mouse)) {
                    newItem.coor[0] = (x - this.originX) / this.scale;
                    newItem.coor[1] = (y - this.originY) / this.scale;
                    // 防止位置重叠
                    if (newItem.coor[0] == this.dataset[num].coor[0] && newItem.coor[1] == this.dataset[num].coor[1]) {
                        newItem.coor[0] += 2;
                        newItem.coor[1] += 2;
                    }
                } else {
                    return;
                }
                newItem.uuid = createUuid();
                this.dataset.push(newItem); // 添加到 dataset 中
                this.dataset[num].active = false;
                this.dataset.forEach((item, i) => { item.index = i; });
                this.update();
                this.doneList.push(deepClone(this.dataset));
            } else if (this.activeShape.type === Shape.Circle) {
                const newItem = new Circle(
                    {
                        ...this.dataset[num], // 复制所有简单属性
                        coor: [...this.dataset[num].coor], // 深拷贝数组
                        radius: this.activeShape.radius, // 深拷贝 radius
                    },
                    this.dataset[num].index
                );
                const [x, y] = this.mouse || [];
                if (this.isPointInBackground(this.mouse)) {
                    newItem.coor[0] = (x - this.originX) / this.scale;
                    newItem.coor[1] = (y - this.originY) / this.scale;
                    let point1: Point = [x - newItem.radius, y];//左顶点
                    let point2: Point = [x + newItem.radius, y];//右顶点
                    let point3: Point = [x, y - newItem.radius];//上顶点
                    let point4: Point = [x, y + newItem.radius];//下顶点
                    if (!this.isPointInBackground(point1)) {
                        newItem.coor[0] = (x - this.originX) / this.scale + newItem.radius;
                        newItem.coor[1] = (y - this.originY) / this.scale;
                        if (!this.isPointInBackground(point2)) {
                            return;
                        }
                    }
                    if (!this.isPointInBackground(point2)) {
                        newItem.coor[0] = (x - this.originX) / this.scale - newItem.radius;
                        newItem.coor[1] = (y - this.originY) / this.scale;
                        if (!this.isPointInBackground(point1)) {
                            return;
                        }
                    }
                    if (!this.isPointInBackground(point3)) {
                        newItem.coor[0] = (x - this.originX) / this.scale;
                        newItem.coor[1] = (y - this.originY) / this.scale + newItem.radius;
                        if (!this.isPointInBackground(point4)) {
                            return;
                        }
                    }
                    if (!this.isPointInBackground(point4)) {
                        newItem.coor[0] = (x - this.originX) / this.scale;
                        newItem.coor[1] = (y - this.originY) / this.scale - newItem.radius;
                        if (!this.isPointInBackground(point3)) {
                            return;
                        }
                    }
                } else {
                    return;
                }
                newItem.uuid = createUuid();
                this.dataset.push(newItem); // 添加到 dataset 中
                this.dataset[num].active = false;
                this.dataset.forEach((item, i) => { item.index = i; });
                this.update();
                this.doneList.push(deepClone(this.dataset));
                return;
            } else if (this.activeShape.type === Shape.Line) {
                return;
            } else if (this.activeShape.type === Shape.Polygon) {
                return;
            } else if (this.activeShape.type === Shape.Grid) {
                return;
            } else if (this.activeShape.type === Shape.None) {
                return;
            } else {
                return;
            }
        }
    }

    /**
     * 计算缩放步长
     */
    calcStep(flag = '') {
        if (this.IMAGE_WIDTH < this.WIDTH && this.IMAGE_HEIGHT < this.HEIGHT) {
            if (flag === '' || flag === 'b') {
                this.setScale(true, false, true);
                this.calcStep('b');
            }
        }
        if (this.IMAGE_WIDTH > this.WIDTH || this.IMAGE_HEIGHT > this.HEIGHT) {
            if (flag === '' || flag === 's') {
                this.setScale(false, false, true);
                this.calcStep('s');
            }
        }
    }

    /**
     * 缩放
     * @param type true放大5%，false缩小5%
     * @param center 缩放中心 center|mouse
     * @param pure 不绘制
     */
    setScale(type: boolean, byMouse = false, pure = false) {
        if (this.lock) return;
        if ((!type && this.imageMin < 120) || (type && this.IMAGE_WIDTH > this.imageOriginMax * 10)) return;
        if (type) { this.scaleStep++; } else { this.scaleStep--; }
        let realToLeft = 0;
        let realToRight = 0;
        const [x, y] = this.mouse || [];
        if (byMouse) {
            realToLeft = (x - this.originX) / this.scale;
            realToRight = (y - this.originY) / this.scale;
        }
        const abs = Math.abs(this.scaleStep);
        const width = this.IMAGE_WIDTH;
        this.IMAGE_WIDTH = Math.round(this.IMAGE_ORIGIN_WIDTH * (this.scaleStep >= 0 ? 1.05 : 0.95) ** abs);
        this.IMAGE_HEIGHT = Math.round(this.IMAGE_ORIGIN_HEIGHT * (this.scaleStep >= 0 ? 1.05 : 0.95) ** abs);
        if (byMouse) {
            this.originX = x - realToLeft * this.scale;
            this.originY = y - realToRight * this.scale;
        } else {
            const scale = this.IMAGE_WIDTH / width;
            this.originX = this.WIDTH / 2 - (this.WIDTH / 2 - this.originX) * scale;
            this.originY = this.HEIGHT / 2 - (this.HEIGHT / 2 - this.originY) * scale;
        }
        this.emit('scale', {type: type, byMouse: byMouse, pure: pure});
        if (!pure) {
            this.update();
        }
    }

    /**
     * 适配背景图
     */
    fitZoom() {
        this.calcStep();
        if (this.IMAGE_HEIGHT / this.IMAGE_WIDTH >= this.HEIGHT / this.WIDTH) {
            this.IMAGE_WIDTH = this.IMAGE_ORIGIN_WIDTH / (this.IMAGE_ORIGIN_HEIGHT / this.HEIGHT);
            this.IMAGE_HEIGHT = this.HEIGHT;
        } else {
            this.IMAGE_WIDTH = this.WIDTH;
            this.IMAGE_HEIGHT = this.IMAGE_ORIGIN_HEIGHT / (this.IMAGE_ORIGIN_WIDTH / this.WIDTH);
        }
        this.originX = (this.WIDTH - this.IMAGE_WIDTH) / 2;
        this.originY = (this.HEIGHT - this.IMAGE_HEIGHT) / 2;
        this.emit('fitZoom');
        this.update();
    }

    /**
     * 设置专注模式
     * @param type {boolean}
     */
    setFocusMode(type: boolean) {
        this.focusMode = type;
        this.update();
        // this.doneList.push(deepClone(this.dataset));
    }

    /**
     * 撤销操作（目前不支持撤销隐藏、显示、专注等模式和状态切换）
     * 若支持，需要设置一个操作数组，每次往doneList中push时，记录下操作类型。撤销时，执行相应的逆方法
     */
    undo() {
        if (this.doneList.length > 1) {
            const lastDoneItem = this.doneList[this.doneList.length - 1];
            this.undoList.push(lastDoneItem);
            this.doneList.pop();
            this.dataset = this.doneList[this.doneList.length - 1];
            this.setData(this.dataset, false);
        }
    }

    /**
    * 重做操作
    */
    redo() {
        if (this.undoList.length > 0) {
            const lastDoneItem = this.undoList[this.undoList.length - 1];
            this.doneList.push(lastDoneItem);
            this.undoList.pop();
            this.dataset = this.doneList[this.doneList.length - 1];
            this.setData(this.dataset, false);
        }
    }


    /**
     * 销毁
     */
    destroy() {
        this.image.removeEventListener('load', this.handleLoad);
        this.canvas.removeEventListener('contextmenu', this.handleContextmenu);
        this.canvas.removeEventListener('mousewheel', this.handleMousewheel);
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('touchend', this.handleMouseDown);
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        this.canvas.removeEventListener('touchmove', this.handleMouseMove);
        this.canvas.removeEventListener('mouseup', this.handleMouseUp);
        this.canvas.removeEventListener('touchend', this.handleMouseUp);
        this.canvas.removeEventListener('dblclick', this.handleDblclick);
        document.body.removeEventListener('keydown', this.handleKeydown, true);
        document.body.removeEventListener('keyup', this.handleKeyup, true);
        this.canvas.width = this.WIDTH;
        this.canvas.height = this.HEIGHT;
        this.canvas.style.width = null;
        this.canvas.style.height = null;
        this.canvas.style.userSelect = null;
    }

    /**
     * 重新设置画布大小
     */
    resize(width: number, height: number, alpha: number = 1) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.canvas.style.width = String(width) + 'px';
        this.canvas.style.height = String(height) + 'px';
        this.setImage(this.imagesrc, alpha);
        this.initSetting();
        this.update();
    }

}
