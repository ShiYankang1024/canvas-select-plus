import Rect from "./shape/Rect";
import Polygon from "./shape/Polygon";
import Dot from "./shape/Dot";
import EventBus from "./EventBus";
import Line from "./shape/Line";
import Circle from "./shape/Circle";
import Grid from "./shape/Grid";
import Brush from "./shape/Brush";
import Mask from "./shape/Mask";
import Pencil from "./shape/Pencil";
import BrushMask from "./shape/BrushMask";
import pkg from "../package.json";
import { isNested, createUuid, deepClone, deepEqual } from "./tools";
import * as martinez from "martinez-polygon-clipping";

export type Point = [number, number];
export type AllShape =
  | Rect
  | Polygon
  | Dot
  | Line
  | Circle
  | Grid
  | Brush
  | Mask
  | Pencil
  | BrushMask;
enum Shape {
  None,
  Rect,
  Polygon,
  Dot,
  Line,
  Circle,
  Grid,
  Brush,
  Mask,
  Pencil,
  BrushMask
}

interface MagicPoint {
  coor: [number, number];
  color: string;
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
  /** 缩放图像的最小边长 */
  MIN_LENGTH = 140;
  /** 边线颜色 */
  strokeStyle = "#000";
  /** 填充颜色 */
  fillStyle = "rgba(0, 0, 255, 0.1)";
  /** 边线宽度 */
  lineWidth = 2;
  /** 当前选中的标注边线颜色 */
  activeStrokeStyle = "#000";
  /** 当前选中的标注填充颜色 */
  activeFillStyle = "#000";
  /** 控制点边线颜色 */
  ctrlStrokeStyle = "#000";
  /** 控制点填充颜色 */
  ctrlFillStyle = "#fff";
  /** 控制点半径 */
  ctrlRadius = 3;
  /** 是否隐藏标签 */
  hideLabel = false;
  /** 标签背景填充颜色 */
  labelFillStyle = "rgba(255, 255, 255, 0.5)";
  /** 标签字体 */
  // labelFont = '12px sans-serif';
  /** 标签字型 */
  labelFontFamily = "sans-serif";
  /** 标签字号 */
  labelFontSize = 18;
  /** 标签文字颜色 */
  textFillStyle = "#FFFFFF";
  /** 标签字符最大长度，超出使用省略号 */
  labelMaxLen = 10;
  /** 画布宽度 */
  WIDTH = 0;
  /** 画布高度 */
  HEIGHT = 0;
  /** 背景图src */
  imagesrc = "";
  imagealpha = 1;

  canvas: HTMLCanvasElement;

  ctx: CanvasRenderingContext2D;
  /** 变化前的所有标注数据 */
  olddataset: AllShape[] = [];
  /** 所有标注数据 */
  dataset: AllShape[] = [];

  /** 撤销数组最多保存记录条数 */
  MAX_LENGTH = 10;

  // 保存一次完成的修改后的记录(触发按钮事件或鼠标抬起)
  doneList: AllShape[][] = [];

  // 保存撤销的记录
  undoList: AllShape[][] = [];

  /** 记录所有隐藏图形的uuid*/
  hideList: string[] = [];

  offScreen: HTMLCanvasElement;

  offScreenCtx: CanvasRenderingContext2D;
  /** 记录锚点距离 */
  remmber: number[][];
  /** 记录鼠标位置 */
  mouse: Point;
  /** 记录背景图鼠标位移 */
  remmberOrigin: number[] = [0, 0];
  /** 0 不创建，1 矩形，2 多边形，3 点，4 折线，5 圆，6 网格, 7 刷子brush, 8 Mask，9 钢笔 */
  createType: Shape = Shape.None; //
  /** 控制点索引 */
  ctrlIndex = -1;
  /** 选中控制点索引 */
  clickIndex = -1;
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
  /** 图片缩放步长 */
  scaleStep = 0;
  /** 标签名缩放步长 */
  textscaleStep = 0;
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
  isMobile = navigator.userAgent.includes("Mobile");
  /** 向上展示label */
  labelUp = false;
  private isCtrlKey = false;
  /** 自定义ctrl快捷键 KeyboardEvent.code */
  ctrlCode = "ControlLeft";
  /** 网格右键菜单 */
  gridMenuEnable = true;
  /** 网格选中背景填充颜色 */
  gridSelectedFillStyle = "rgba(255, 255, 0, 0.8)";

  /** 记录是否正在使用brush */
  ispainting = false;

  /** brush线条样式 */
  brushlineWidth = 1;
  brushstrokeStyle = "rgba(255, 0, 0, 0.8)";

  pencillineWidth = 0.5;
  pencilstrokeStyle = "rgba(255, 0, 0, 0.8)";

  // maskfillStyle = "rgba(255, 0, 0, 0.5)";
  mask_alpha = 96;
  densityFactor = 1;

  /** 记录正在生成轮廓的mask的canvasData */
  activeCanvasData: ImageData | null = null;
  /** 记录正在生成的轮廓 */
  activePolygon: string = "";

  isEraser = false;
  isErasing = false;

  eraserPoints: [number, number][] = [];

  /** 暂存未保存的brush轨迹点 */
  tempBrushPoints: [number, number][] = [];

  eraserSize = 8; // 橡皮擦的半径

  random_color = [
    { r: 255, g: 0, b: 0 },
    { r: 0, g: 255, b: 0 },
    { r: 0, b: 255, g: 0 }
  ];

  isMagicToolActive = false;

  magicPoints: MagicPoint[] = [];

  maxLinePointCount = 2;

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
    const container = typeof el === "string" ? document.querySelector(el) : el;
    if (container instanceof HTMLCanvasElement) {
      this.canvas = container;
      this.offScreen = document.createElement("canvas");
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
      console.warn("HTMLCanvasElement is required!");
    }
  }

  /** 当前选中的标注 */
  get activeShape() {
    return this.dataset.find((x) => x.active) || ({} as any);
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
        const { clientX: clientX1 = 0, clientY: clientY1 = 0 } =
          (e as TouchEvent).touches[1] || {};
        mouseCX = Math.round(
          Math.abs((clientX1 - clientX) / 2 + clientX) - left
        );
        mouseCY = Math.round(
          Math.abs((clientY1 - clientY) / 2 + clientY) - top
        );
      }
    } else {
      mouseX = (e as MouseEvent).offsetX;
      mouseY = (e as MouseEvent).offsetY;
    }
    return { ...e, mouseX, mouseY, mouseCX, mouseCY };
  }

  private handleLoad() {
    this.emit("load", this.image.src);
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

    if (
      (e.deltaY > 0 && this.imageMin < this.MIN_LENGTH) ||
      (e.deltaY < 0 && this.IMAGE_WIDTH > this.imageOriginMax * 10)
    ) {
      return;
    } else {
      if (e.deltaY < 0) {
        this.textscaleStep++;
      } else {
        this.textscaleStep--;
      }
      this.setScale(e.deltaY < 0, true);
    }
  }

  private handleMouseDown(e: MouseEvent | TouchEvent) {
    e.stopPropagation();
    this.evt = e;
    if (this.lock) return;
    const { mouseX, mouseY, mouseCX, mouseCY } = this.mergeEvent(e);
    const offsetX = Math.round(mouseX / this.scale);
    const offsetY = Math.round(mouseY / this.scale);
    this.mouse =
      this.isMobile && (e as TouchEvent).touches.length === 2
        ? [mouseCX, mouseCY]
        : [mouseX, mouseY];
    this.remmberOrigin = [mouseX - this.originX, mouseY - this.originY];
    // 记录变化前的数据
    this.olddataset = deepClone(this.dataset);
    if (
      (!this.isMobile && (e as MouseEvent).buttons === 1) ||
      (this.isMobile && (e as TouchEvent).touches.length === 1)
    ) {
      // 鼠标左键
      const ctrls = this.activeShape.ctrlsData || [];
      this.ctrlIndex = ctrls.findIndex((coor: Point) =>
        this.isPointInCircle(this.mouse, coor, this.ctrlRadius)
      );
      this.clickIndex = this.ctrlIndex; // 记录选中的控制点索引，用于控制点加粗变红和编辑控制点
      if (this.ctrlIndex > -1 && !this.readonly) {
        // 点击到控制点
        console.log("this.ctrlIndex", this.ctrlIndex);
        const [x0, y0] = ctrls[this.ctrlIndex];
        if (
          this.activeShape.type === Shape.Polygon &&
          this.activeShape.coor.length > 2 &&
          this.ctrlIndex === 0 &&
          this.activeShape.creating
        ) {
          this.handleDblclick(e);
        } else {
          this.update();
        }
        this.remmber = [[offsetX - x0, offsetY - y0]];
      } else if (this.isInBackground(e)) {
        if (this.activeShape.creating && !this.readonly) {
          // 创建中
          if ([Shape.Polygon, Shape.Line].includes(this.activeShape.type)) {
            const [x, y] =
              this.activeShape.coor[this.activeShape.coor.length - 1];
            if (x !== offsetX && y !== offsetY) {
              const nx = Math.round(offsetX - this.originX / this.scale);
              const ny = Math.round(offsetY - this.originY / this.scale);
              this.activeShape.coor.push([nx, ny]);
            }
          }
        } else if (
          this.createType !== Shape.None &&
          !this.readonly &&
          !this.isCtrlKey
        ) {
          // 开始创建
          let newShape;
          const nx = Math.round(offsetX - this.originX / this.scale);
          const ny = Math.round(offsetY - this.originY / this.scale);
          const curPoint: Point = [nx, ny];
          switch (this.createType) {
            case Shape.Rect:
              newShape = new Rect(
                { coor: [curPoint, curPoint] },
                this.dataset.length
              );
              newShape.creating = true;
              break;
            case Shape.Polygon:
              newShape = new Polygon({ coor: [curPoint] }, this.dataset.length);
              newShape.creating = true;
              break;
            case Shape.Dot:
              newShape = new Dot({ coor: curPoint }, this.dataset.length);
              this.emit("add", newShape);
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
              newShape = new Grid(
                { coor: [curPoint, curPoint] },
                this.dataset.length
              );
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
            case Shape.Pencil:
              newShape = new Pencil({ coor: [curPoint] }, this.dataset.length);
              newShape.creating = true;
              newShape.lineWidth = this.pencillineWidth;
              newShape.strokeStyle = this.pencilstrokeStyle;
              this.ispainting = true;
              break;
            default:
              break;
          }
          this.dataset.forEach((sp) => {
            sp.active = false;
          });
          newShape.active = true;
          this.dataset.push(newShape);
        } else {
          // 是否点击到形状
          const [hitShapeIndex, hitShape] = this.hitOnShape(this.mouse);
          if (hitShapeIndex > -1 && !hitShape.locking && !this.readonly) {
            if (
              hitShape.type === Shape.Dot &&
              "color" in hitShape &&
              hitShape.color !== ""
            ) {
              return; // 智能标注生成的点不可被选中
            }
            if (hitShape.type === Shape.Brush) {
              if ("iseraser" in hitShape && !hitShape.iseraser) {
                this.dataset.forEach(
                  (item, i) => (item.active = i === hitShapeIndex)
                );
                if (this.activeShape.boundingRect.length === 0) {
                  this.activeShape.boundingRect = this.removeDuplicatePoints(
                    hitShape.coor,
                    true,
                    false
                  ).resultRect;
                }
                this.emit("select", hitShape);
              }
              return; // 刷子、橡皮檫和钢笔轨迹不可被拖拽
            }
            if (hitShape.type === Shape.Pencil) {
              this.dataset.forEach(
                (item, i) => (item.active = i === hitShapeIndex)
              );
              // if (this.activeShape.boundingRect.length === 0) {
              //   this.activeShape.boundingRect = this.removeDuplicatePoints(
              //     hitShape.coor,
              //     true,
              //     false
              //   ).resultRect;
              // }
              this.emit("select", hitShape);
              this.update();
              return; // 刷子、橡皮檫和钢笔轨迹不可被拖拽
            }
            // if(hitShape.type === Shape.Mask){
            //     hitShape.active = true;
            //     this.highlightMask(hitShapeIndex);
            //     return; // 刷子、橡皮檫和钢笔轨迹不可被拖拽
            // }
            hitShape.dragging = true;
            this.dataset.forEach(
              (item, i) => (item.active = i === hitShapeIndex)
            );
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
            this.emit("select", hitShape);
          } else {
            this.activeShape.active = false;
            this.dataset.sort((a, b) => a.index - b.index);
            this.emit("select", null);
          }
        }
        this.update();
      }
      // else {
      //   this.activeShape.active = false;
      //   this.dataset.sort((a, b) => a.index - b.index);
      //   this.emit("select", null);
      //   this.update();
      // }
    } else if (
      (!this.isMobile && (e as MouseEvent).buttons === 2) ||
      (this.isMobile &&
        (e as TouchEvent).touches.length === 3 &&
        !this.readonly)
    ) {
      // 鼠标右键
      if ([Shape.Grid].includes(this.activeShape.type) && this.gridMenuEnable) {
        const rowCol = prompt(
          "x 行 y 列 x,y",
          [this.activeShape.row, this.activeShape.col].join(",")
        );
        if (typeof rowCol === "string") {
          const [row, col] = rowCol.split(",");
          if (/^[1-9]\d*$/.test(row) && /^[1-9]\d*$/.test(col)) {
            this.activeShape.row = Number(row);
            this.activeShape.col = Number(col);
            this.update();
          }
        }
      }
      this.emit("contextmenu", e);
    }
  }

  private handleMouseMove(e: MouseEvent | TouchEvent) {
    e.stopPropagation();
    this.evt = e;
    if (this.lock) return;
    const { mouseX, mouseY, mouseCX, mouseCY } = this.mergeEvent(e);
    const offsetX = Math.round(mouseX / this.scale);
    const offsetY = Math.round(mouseY / this.scale);
    this.mouse =
      this.isMobile && (e as TouchEvent).touches.length === 2
        ? [mouseCX, mouseCY]
        : [mouseX, mouseY];
    if (
      ((!this.isMobile && (e as MouseEvent).buttons === 1) ||
        (this.isMobile && (e as TouchEvent).touches.length === 1)) &&
      this.activeShape.type
    ) {
      if (
        this.ctrlIndex > -1 &&
        this.remmber.length &&
        (this.isInBackground(e) || this.activeShape.type === Shape.Circle)
      ) {
        const [[x, y]] = this.remmber;
        // resize矩形
        if ([Shape.Rect, Shape.Grid].includes(this.activeShape.type)) {
          const [[x0, y0], [x1, y1]] = this.activeShape.coor;
          let coor: Point[] = [];
          switch (this.ctrlIndex) {
            case 0:
              coor = [
                [offsetX - x, offsetY - y],
                [x1, y1]
              ];
              break;
            case 1:
              coor = [
                [x0, offsetY - y],
                [x1, y1]
              ];
              break;
            case 2:
              coor = [
                [x0, offsetY - y],
                [offsetX - x, y1]
              ];
              break;
            case 3:
              coor = [
                [x0, y0],
                [offsetX - x, y1]
              ];
              break;
            case 4:
              coor = [
                [x0, y0],
                [offsetX - x, offsetY - y]
              ];
              break;
            case 5:
              coor = [
                [x0, y0],
                [x1, offsetY - y]
              ];
              break;
            case 6:
              coor = [
                [offsetX - x, y0],
                [x1, offsetY - y]
              ];
              break;
            case 7:
              coor = [
                [offsetX - x, y0],
                [x1, y1]
              ];
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
            this.activeShape.coor = [
              [a0, b0],
              [a1, b1]
            ];
          } else {
            this.emit(
              "warn",
              `Width cannot be less than ${this.MIN_WIDTH},Height cannot be less than${this.MIN_HEIGHT}。`
            );
          }
        } else if (
          [Shape.Polygon, Shape.Line].includes(this.activeShape.type)
        ) {
          const nx = Math.round(offsetX - this.originX / this.scale);
          const ny = Math.round(offsetY - this.originY / this.scale);
          const newPoint = [nx, ny];
          this.activeShape.coor.splice(this.ctrlIndex, 1, newPoint); // 修改点坐标
        } else if (this.activeShape.type === Shape.Circle) {
          const nx = Math.round(offsetX - this.originX / this.scale);
          const newRadius = nx - this.activeShape.coor[0];
          if (newRadius >= this.MIN_RADIUS) this.activeShape.radius = newRadius;
        }
      } else if (this.activeShape.dragging && !this.readonly) {
        // 拖拽
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
        } else if (this.ispainting && this.createType === Shape.Brush) {
          const nx = Math.round(offsetX - this.originX / this.scale);
          const ny = Math.round(offsetY - this.originY / this.scale);
          const newPoint: Point = [nx, ny];
          this.activeShape.coor.push(newPoint);
        } else if (this.ispainting && this.createType === Shape.Pencil) {
          const nx = Math.round(offsetX - this.originX / this.scale);
          const ny = Math.round(offsetY - this.originY / this.scale);
          const newPoint: Point = [nx, ny];
          this.activeShape.coor.push(newPoint);
        }
      }
      this.update();
    } else if (
      [Shape.Polygon, Shape.Line, Shape.Brush, Shape.Pencil].includes(
        this.activeShape.type
      ) &&
      this.activeShape.creating
    ) {
      // 多边形添加点
      this.update();
    } else if (
      (!this.isMobile &&
        (e as MouseEvent).buttons === 2 &&
        (e as MouseEvent).which === 3) ||
      (this.isMobile &&
        (e as TouchEvent).touches.length === 1 &&
        !this.isTouch2)
    ) {
      // 拖动背景
      this.originX = Math.round(mouseX - this.remmberOrigin[0]);
      this.originY = Math.round(mouseY - this.remmberOrigin[1]);
      this.emit("dragimg");
      this.update();
    } else if (this.isMobile && (e as TouchEvent).touches.length === 2) {
      this.isTouch2 = true;
      const touch0 = (e as TouchEvent).touches[0];
      const touch1 = (e as TouchEvent).touches[1];
      const cur = this.scaleTouchStore;
      this.scaleTouchStore = Math.abs(
        (touch1.clientX - touch0.clientX) * (touch1.clientY - touch0.clientY)
      );
      this.setScale(this.scaleTouchStore > cur, true);
    }
  }

  private handleMouseUp(e: MouseEvent | TouchEvent) {
    console.log("handleMouseUp");
    e.stopPropagation();
    this.evt = e;
    if (this.lock) return;
    if (this.isMobile) {
      if ((e as TouchEvent).touches.length === 0) {
        this.isTouch2 = false;
      }
      if (Date.now() - this.dblTouchStore < this.dblTouch) {
        this.handleDblclick(e);
        return;
      }
      this.dblTouchStore = Date.now();
    }
    this.remmber = [];
    if (this.activeShape.type !== Shape.None && !this.isCtrlKey) {
      // if (this.activeShape.dragging) {
      //   this.activeShape.truncated = 0;
      //   for (let i = 0; i < this.dataset.length; i++) {
      //     if (
      //       this.dataset[i].type === Shape.Rect &&
      //       this.dataset[i].index !== this.activeShape.index
      //     ) {
      //       if (
      //         this.dataset[i].coor[1][0] > this.activeShape.coor[0][0] &&
      //         this.dataset[i].coor[0][0] < this.activeShape.coor[1][0] &&
      //         this.dataset[i].coor[1][1] > this.activeShape.coor[0][1] &&
      //         this.dataset[i].coor[0][1] < this.activeShape.coor[1][1]
      //       ) {
      //         this.activeShape.truncated = 1;
      //       }
      //     }
      //   }
      // }
      this.activeShape.dragging = false;
      if (this.activeShape.creating) {
        if ([Shape.Rect, Shape.Grid].includes(this.activeShape.type)) {
          const [[x0, y0], [x1, y1]] = this.activeShape.coor;
          if (
            Math.abs(x0 - x1) < this.MIN_WIDTH ||
            Math.abs(y0 - y1) < this.MIN_HEIGHT
          ) {
            this.dataset.pop();
            this.emit(
              "warn",
              `Width cannot be less than ${this.MIN_WIDTH},Height cannot be less than ${this.MIN_HEIGHT}`
            );
          } else {
            this.activeShape.coor = [
              [Math.min(x0, x1), Math.min(y0, y1)],
              [Math.max(x0, x1), Math.max(y0, y1)]
            ];
            this.activeShape.creating = false;
            this.activeShape.truncated = 0;
            // 判断是否有重叠
            // for (let i = 0; i < this.dataset.length; i++) {
            //   if (
            //     this.dataset[i].type === Shape.Rect &&
            //     this.dataset[i].index !== this.activeShape.index
            //   ) {
            //     if (
            //       this.dataset[i].coor[1][0] > this.activeShape.coor[0][0] &&
            //       this.dataset[i].coor[0][0] < this.activeShape.coor[1][0] &&
            //       this.dataset[i].coor[1][1] > this.activeShape.coor[0][1] &&
            //       this.dataset[i].coor[0][1] < this.activeShape.coor[1][1]
            //     ) {
            //       this.activeShape.truncated = 1;
            //     }
            //   }
            // }
            this.emit("add", this.activeShape);
          }
        } else if (this.activeShape.type === Shape.Circle) {
          if (this.activeShape.radius < this.MIN_RADIUS) {
            this.dataset.pop();
            this.emit("warn", `Radius cannot be less than ${this.MIN_WIDTH}`);
          } else {
            this.activeShape.creating = false;
            this.emit("add", this.activeShape);
          }
        } else if (this.createType === Shape.Brush) {
          if (this.activeShape.coor.length < this.MIN_POINTNUM) {
            this.dataset.pop();
            this.emit(
              "warn",
              `Path points cannot be less than ${this.MIN_POINTNUM}`
            );
          } else {
            this.ispainting = false;
            this.activeShape.creating = false;
            // 去除重复点
            const { resultCoor, resultRect } = this.removeDuplicatePoints(
              this.activeShape.coor,
              true
            );
            this.activeShape.coor = resultCoor;
            // 使用rle编码
            // const [x, y, width, height] = resultRect;
            // console.log("rel:", this.relEncodeBinary(x, y, width, height));
            this.activeShape.boundingRect = resultRect;
            this.emit("add", this.activeShape);
          }
        } else if (this.createType === Shape.Pencil) {
          if (this.activeShape.coor.length < this.MIN_POINTNUM) {
            this.dataset.pop();
            this.emit(
              "warn",
              `Path points cannot be less than ${this.MIN_POINTNUM}`
            );
          } else {
            this.ispainting = false;
            this.activeShape.creating = false;
            for (let i = this.dataset.length - 1; i >= 0; i--) {
              const item = this.dataset[i];
              if (
                item.type === Shape.Pencil &&
                item.uuid !== this.activeShape.uuid
              ) {
                const pencilItem = item as Pencil;
                const closedPoly1 = this.closePolygon(pencilItem.coor);
                let closedPoly2 = this.closePolygon(this.activeShape.coor);
                const intersectionResult = martinez.intersection(
                  closedPoly1,
                  closedPoly2
                );
                if (intersectionResult && intersectionResult.length > 0) {
                  // 颜色相同
                  if (item.strokeStyle === this.activeShape.strokeStyle) {
                    const unionResult = martinez.union(
                      closedPoly1,
                      closedPoly2
                    );
                    if (unionResult?.[0]?.[0]) {
                      this.activeShape.coor = unionResult[0][0];
                      closedPoly2 = this.closePolygon(this.activeShape.coor);
                    }
                    // 从数组中删除当前 item
                    this.dataset.splice(i, 1);
                  } else {
                    // 颜色不同
                    const bMinusA = martinez.diff(closedPoly2, closedPoly1); // activeShape - pencilItem
                    if (!bMinusA || bMinusA.length === 0) {
                      // // activeShape 完全被 pencilItem 包含：将 activeShape 外轮廓添加为 pencilItem 的内孔
                      // if (!pencilItem.innerCoor) pencilItem.innerCoor = [];
                      // pencilItem.innerCoor.push(
                      //   deepClone(this.activeShape.coor)
                      // );
                      // // activeShape 保留，pencilItem 添加内孔
                      continue;
                    } else {
                      // activeShape 不包含于 pencilItem，执行 pencilItem - activeShape
                      const AMinusB = martinez.diff(closedPoly1, closedPoly2);
                      if (!AMinusB || AMinusB.length === 0) {
                        this.dataset.splice(i, 1); // pencilItem 完全被 activeShape 吃掉
                      } else {
                        pencilItem.coor = AMinusB[0][0]; // pencilItem 保留非交集部分
                        pencilItem.coor[pencilItem.coor.length - 1] = [-1, -1]; // 添加结束点
                      }
                    }
                  }
                }
              }
            }
            this.activeShape.coor.push([-1, -1]);
            // 去除重复点
            const { resultCoor, resultRect } = this.removeDuplicatePoints(
              this.activeShape.coor,
              false
            );
            this.activeShape.coor = resultCoor;
            // this.activeShape.boundingRect = resultRect;
            this.emit("add", this.activeShape);
          }
        } else if (this.createType === Shape.Line) {
          if (this.activeShape.coor.length === this.maxLinePointCount) {
            const canLine =
              this.activeShape.type === Shape.Line &&
              this.activeShape.coor.length > 1;
            if (canLine) {
              this.emit("add", this.activeShape);
              this.activeShape.creating = false;
            }
          }
        }
        this.update();
      }
      const condition = [
        "coor",
        "label",
        "labelUp",
        "lineWidth",
        "strokeStyle",
        "textFillStyle",
        "uuid",
        "remark",
        "length"
      ];
      // console.log(deepEqual(this.olddataset, this.dataset, condition));
      // console.log("this.olddataset", this.olddataset);
      // console.log("this.dataset", this.dataset);
      if (!deepEqual(this.olddataset, this.dataset, condition)) {
        this.manageDoneList(deepClone(this.dataset));
        console.log("this.doneList", this.doneList);
      }
    }
  }

  private handleDblclick(e: MouseEvent | TouchEvent) {
    e.stopPropagation();
    this.evt = e;
    if (this.lock) return;
    if ([Shape.Polygon, Shape.Line].includes(this.activeShape.type)) {
      const canPolygon =
        this.activeShape.type === Shape.Polygon &&
        this.activeShape.coor.length > 2;
      const canLine =
        this.activeShape.type === Shape.Line &&
        this.activeShape.coor.length > 1;
      if ((canPolygon || canLine) && this.activeShape.creating) {
        this.emit("add", this.activeShape);
        this.activeShape.creating = false;
        this.update();
      }
    } else if ([Shape.Grid].includes(this.activeShape.type)) {
      // 双击切换网格分区选中状态
      if (this.activeShape.active) {
        this.activeShape.gridRects.forEach(
          (rect: { coor: Point[]; index: number }) => {
            if (this.isPointInRect(this.mouse, rect.coor)) {
              const thisIndex = this.activeShape.selected.findIndex(
                (x: number) => rect.index === x
              );
              if (thisIndex > -1) {
                this.activeShape.selected.splice(thisIndex, 1);
              } else {
                this.activeShape.selected.push(rect.index);
              }
            }
          }
        );
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
    if (this.isCtrlKey && e.key === "v" && !this.readonly) {
      this.copyByIndex(this.activeShape.index);
      return; // 直接返回，防止执行后续代码
    }
    if (this.lock || document.activeElement !== document.body || this.readonly)
      return;
    if (this.activeShape.type) {
      if (
        [Shape.Polygon, Shape.Line].includes(this.activeShape.type) &&
        e.key === "Escape"
      ) {
        if (this.activeShape.coor.length > 1 && this.activeShape.creating) {
          this.activeShape.coor.pop();
        } else {
          this.deleteByIndex(this.activeShape.index);
        }
        this.update();
      } else if (e.key === "Backspace" || e.key === "Delete") {
        this.deleteByIndex(this.activeShape.index);
      }
    }
  }

  /** 初始化配置 */
  initSetting() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.userSelect = "none";
    this.ctx =
      this.ctx ||
      this.canvas.getContext("2d", {
        alpha: this.alpha,
        willReadFrequently: true
      });
    this.WIDTH = Math.round(this.canvas.clientWidth);
    this.HEIGHT = Math.round(this.canvas.clientHeight);
    this.canvas.width = this.WIDTH * dpr;
    this.canvas.height = this.HEIGHT * dpr;
    this.canvas.style.width = this.WIDTH + "px";
    this.canvas.style.height = this.HEIGHT + "px";
    this.offScreen.width = this.WIDTH;
    this.offScreen.height = this.HEIGHT;
    this.offScreenCtx =
      this.offScreenCtx ||
      this.offScreen.getContext("2d", { willReadFrequently: true });
    this.ctx.scale(dpr, dpr);
  }

  /** 初始化事件 */
  initEvents() {
    if (!this.canvas) return;
    this.image.addEventListener("load", this.handleLoad);
    this.canvas.addEventListener("touchstart", this.handleMouseDown);
    this.canvas.addEventListener("touchmove", this.handleMouseMove);
    this.canvas.addEventListener("touchend", this.handleMouseUp);
    this.canvas.addEventListener("contextmenu", this.handleContextmenu);
    this.canvas.addEventListener("mousewheel", this.handleMousewheel); // 火狐浏览器不支持mousewheel事件
    this.canvas.removeEventListener("wheel", this.handleMousewheel); // 解决火狐浏览器不支持mousewheel事件的问题
    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    this.canvas.addEventListener("mouseup", this.handleMouseUp);
    this.canvas.addEventListener("dblclick", this.handleDblclick);
    document.body.addEventListener("keydown", this.handleKeydown, true);
    document.body.addEventListener("keyup", this.handleKeyup, true);
  }

  getscaledPoint(e: MouseEvent): Point {
    const { mouseX, mouseY } = this.mergeEvent(e);
    const offsetX = Math.round(mouseX / this.scale);
    const offsetY = Math.round(mouseY / this.scale);
    const nx = Math.round(offsetX - this.originX / this.scale);
    const ny = Math.round(offsetY - this.originY / this.scale);
    return [nx, ny];
  }

  closePolygon = (poly: any[]) => {
    const closedPoly = poly.filter(
      (point) => point[0] !== -1 || point[1] !== -1
    ); // 去掉 (-1, -1)
    if (closedPoly.length > 0) {
      closedPoly.push(closedPoly[0]); // 添加首点以闭合路径
    }
    return [closedPoly]; // 返回二维数组，符合 martinez 格式
  };

  /**
   * 添加/切换图片
   * @param url 图片链接
   */
  setImage(url: string, alpha: number = 1) {
    // 解决问题：Failed to execute 'toDataURL' on 'HTMLCanvasElement': Tainted canvases may not be exported.
    this.image.crossOrigin = "Anonymous";
    this.image.src = url;
    this.imagealpha = alpha;
    this.scaleStep = 0;
    this.textscaleStep = 0;
  }

  // 异步处理 Mask 形状的创建
  async handleMaskShape(
    item: AllShape,
    index: number
  ): Promise<AllShape | null> {
    let tempshape = new Mask(item, index);
    const maskBase64 = tempshape.maskBase64;
    const maskImage = new Image();
    maskImage.crossOrigin = "Anonymous";
    maskImage.src = `data:image/png;base64,${maskBase64}`;

    return new Promise((resolve, reject) => {
      maskImage.onload = () => {
        const pixels: number[] = [];
        const pixelData = this.getImagedataFromImageClass(maskImage, "magic");

        if (pixelData) {
          // 遍历像素，筛选符合条件的像素点
          for (let i = 0; i < pixelData.length; i += 4) {
            if (
              pixelData[i] === 255 &&
              pixelData[i + 1] === 255 &&
              pixelData[i + 2] === 255
            ) {
              pixels.push(i);
            }
          }

          tempshape.pixels = pixels;
          tempshape.height = this.IMAGE_HEIGHT;
          tempshape.weight = this.IMAGE_WIDTH;
          tempshape.fillStyle = item.fillStyle;
          tempshape.strokeStyle = item.strokeStyle;

          // 根据 'maskToPolygon' 判断是否转换为 Polygon 形状
          if (
            "maskToPolygon" in item &&
            item.maskToPolygon &&
            tempshape.maskType === "click"
          ) {
            this.activeCanvasData = this.putDataOnCanvas(
              this.canvas,
              pixels,
              tempshape.fillStyle,
              false
            );
            const polygonShape = new Polygon(
              {
                coor: this.getContourPointsOfColoredRegion(
                  this.activeCanvasData,
                  0.5
                )
              },
              index
            );
            polygonShape.tagId = item.tagId;
            polygonShape.label = item.label;
            polygonShape.strokeStyle = item.strokeStyle;
            this.activePolygon = polygonShape.uuid;
            resolve(polygonShape);
          } else {
            tempshape.canvasData = this.putDataOnCanvas(
              this.canvas,
              pixels,
              tempshape.fillStyle,
              true
            );
            tempshape.tagId = item.tagId;
            tempshape.label = item.label;
            resolve(tempshape);
          }

          // 绘制样本点
          this.magicPoints = tempshape.magicPoints;
        } else {
          console.error("Failed to get pixel data from mask image");
          reject(null); // 如果加载像素数据失败，返回 null
        }
      };

      maskImage.onerror = (err) => {
        console.error("Error loading mask image", err);
        reject(null); // 如果加载图像失败，返回 null
      };
    });
  }

  /**
   * 设置数据
   * @param data Array
   * @param needCreate Boolean 是否需要创建(当传options时需要，当撤销重做操作传dataset时不需要)
   */
  setData(
    data: AllShape[],
    needCreate: boolean = true,
    toMask: boolean = false,
    initSize: boolean = false
  ): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        if (needCreate) {
          const initdata: AllShape[] = [];
          const itemIndexMap = new Map<AllShape, number>();

          data.forEach((item, index) => {
            itemIndexMap.set(item, index);
          });

          for (const item of data) {
            if (Object.prototype.toString.call(item).includes("Object")) {
              let shape;
              const index = itemIndexMap.get(item)!;

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
                case Shape.BrushMask:
                  shape = new BrushMask(item, index);
                  break;
                case Shape.Mask:
                  shape = await this.handleMaskShape(item, index);
                  break;
                case Shape.Pencil:
                  shape = new Pencil(item, index);
                  break;
                default:
                  console.warn("Invalid shape", item);
                  break;
              }

              if (
                [
                  Shape.Rect,
                  Shape.Polygon,
                  Shape.Dot,
                  Shape.Line,
                  Shape.Circle,
                  Shape.Grid,
                  Shape.Brush,
                  Shape.BrushMask,
                  Shape.Mask,
                  Shape.Pencil
                ].includes(item.type)
              ) {
                initdata.push(shape);
              }
            } else {
              console.warn("Shape must be an enumerable Object.", item);
            }
          }

          this.dataset = initdata;
        } else {
          this.dataset = data;
        }

        this.update(toMask, initSize);

        if (this.doneList.length === 0 && this.dataset !== undefined) {
          this.manageDoneList(deepClone(this.dataset));
        }

        resolve(); // ✅ 完成后 resolve promise
      }, 0); // 使用 setTimeout 模拟 nextTick，防止阻塞主线程
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
        this.isPointInBackground(mousePoint) &&
        ((shape.type === Shape.Dot &&
          this.isPointInCircle(
            mousePoint,
            shape.coor as Point,
            this.ctrlRadius
          )) ||
          (shape.type === Shape.Circle &&
            this.isPointInCircle(
              mousePoint,
              shape.coor as Point,
              (shape as Circle).radius * this.scale
            )) ||
          (shape.type === Shape.Rect &&
            this.isPointInRect(mousePoint, (shape as Rect).coor)) ||
          (shape.type === Shape.Polygon &&
            this.isPointInPolygon(mousePoint, (shape as Polygon).coor)) ||
          (shape.type === Shape.Line &&
            this.isPointInLine(mousePoint, (shape as Line).coor)) ||
          (shape.type === Shape.Grid &&
            this.isPointInRect(mousePoint, (shape as Grid).coor)) ||
          (shape.type === Shape.Brush &&
            this.isPointInLine(mousePoint, (shape as Brush).coor)) ||
          (shape.type === Shape.Pencil &&
            this.isPointInPolygon(mousePoint, (shape as Pencil).coor)) ||
          (shape.type === Shape.Mask &&
            this.isMouseInPixelsRegion(mousePoint, (shape as Mask).canvasData)))
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
   * 判断是否在标注实例顶点上
   * @param mousePoint 点击位置
   * @returns
   */
  hitOnShapeVertex(): string {
    let mouseType: string;
    const shape = this.activeShape;
    const ctrls = this.activeShape.ctrlsData || [];
    this.ctrlIndex = ctrls.findIndex((coor: Point) =>
      this.isPointInCircle(this.mouse, coor, this.ctrlRadius)
    );
    if (this.ctrlIndex > -1 && !this.readonly && !shape.hiddening) {
      if (shape.type === Shape.Rect) {
        if (this.ctrlIndex === 0) {
          mouseType = "nw-resize";
        } else if (this.ctrlIndex === 1) {
          mouseType = "ns-resize";
        } else if (this.ctrlIndex === 2) {
          mouseType = "ne-resize";
        } else if (this.ctrlIndex === 3) {
          mouseType = "ew-resize";
        } else if (this.ctrlIndex === 4) {
          mouseType = "se-resize";
        } else if (this.ctrlIndex === 5) {
          mouseType = "ns-resize";
        } else if (this.ctrlIndex === 6) {
          mouseType = "sw-resize";
        } else {
          mouseType = "ew-resize";
        }
      } else if (
        shape.type === Shape.Brush ||
        shape.type === Shape.Pencil ||
        shape.type === Shape.Polygon ||
        shape.type === Shape.Line ||
        shape.type === Shape.Circle
      ) {
        mouseType = "pointer";
      } else {
        mouseType = "move";
      }
    } else {
      mouseType = "";
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
    return (
      mouseX >= this.originX &&
      mouseY >= this.originY &&
      mouseX <= this.originX + this.IMAGE_ORIGIN_WIDTH * this.scale &&
      mouseY <= this.originY + this.IMAGE_ORIGIN_HEIGHT * this.scale
    );
  }

  /**point
   * 判断点是否在背景图内部
   * @param point Point
   * @returns 布尔值
   */
  isPointInBackground(point: Point): boolean {
    const pointX = point[0]; //???????????????
    const pointY = point[1];
    return (
      pointX >= this.originX &&
      pointY >= this.originY &&
      pointX <= this.originX + this.IMAGE_ORIGIN_WIDTH * this.scale &&
      pointY <= this.originY + this.IMAGE_ORIGIN_HEIGHT * this.scale
    );
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
    return (
      x0 + this.originX < x &&
      x < x1 + this.originX &&
      y0 + this.originY < y &&
      y < y1 + this.originY
    );
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
    const onLeftEdge =
      x === x0 + this.originX &&
      y >= y0 + this.originY &&
      y <= y1 + this.originY;
    const onRightEdge =
      x === x1 + this.originX &&
      y >= y0 + this.originY &&
      y <= y1 + this.originY;
    const onTopEdge =
      y === y0 + this.originY &&
      x >= x0 + this.originX &&
      x <= x1 + this.originX;
    const onBottomEdge =
      y === y1 + this.originY &&
      x >= x0 + this.originX &&
      x <= x1 + this.originX;
    if (onLeftEdge || onRightEdge) return "ew-resize";
    if (onTopEdge || onBottomEdge) return "ns-resize";
    return "none";
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
    const onRightBottomEdge =
      x === x1 + this.originX && y === y1 + this.originY;
    const onRightTopEdge = x === x1 + this.originX && y === y0 + this.originY;
    const onLeftBottomEdge = x === x0 + this.originX && y === y1 + this.originY;
    if (onLeftTopPoint) return "nw-resize";
    if (onRightBottomEdge) return "se-resize";
    if (onRightTopEdge) return "ne-resize";
    if (onLeftBottomEdge) return "sw-resize";
    return "none";
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
    const areaData = this.offScreenCtx.getImageData(
      0,
      0,
      this.WIDTH,
      this.HEIGHT
    );
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
    const distance = Math.sqrt(
      (x0 + this.originX - x) ** 2 + (y0 + this.originY - y) ** 2
    );
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
    const areaData = this.offScreenCtx.getImageData(
      0,
      0,
      this.WIDTH,
      this.HEIGHT
    );
    const index = (point[1] - 1) * this.WIDTH * 4 + point[0] * 4;
    this.offScreenCtx.restore();
    return areaData.data[index + 3] !== 0;
  }

  /**
   * 判断是否在折线内
   * @param mousePoint 鼠标坐标
   * @param pixels 像素点索引列表
   * @returns 布尔值
   */
  isMouseInPixelsRegion(mousePoint: Point, canvasData: ImageData): boolean {
    // 调整鼠标坐标（考虑原点偏移和缩放比例）
    const mouseX = Math.floor(mousePoint[0] - this.originX); // 缩放并调整鼠标的 x 坐标
    const mouseY = Math.floor(mousePoint[1] - this.originY); // 缩放并调整鼠标的 y 坐标
    // console.log(`Adjusted mouse coordinates: (${mouseX}, ${mouseY})`);

    // 获取指定点的像素数据
    // 注意canvasData的高宽是向下取整，所以this.IMAGE_WIDTH要统一向下取整
    const index = (mouseY * Math.floor(this.IMAGE_WIDTH) + mouseX) * 4;
    const pixelAlpha = canvasData.data[index + 3]; // 获取透明度（alpha 通道）

    // 判断该点是否在 pixels 区域内
    if (pixelAlpha !== 0) {
      // console.log("Mouse is inside the pixel region.");
      return true; // 如果透明度大于 0，说明该点在像素区域内
    }

    // console.log("Mouse is outside the pixel region.");
    return false; // 否则返回 false
  }

  getBoundingBoxOfColoredRegion(canvasData: ImageData): Point[] {
    const data = canvasData.data; // 获取图像的 RGBA 数据
    const width = canvasData.width; // 图像的宽度
    const height = canvasData.height; // 图像的高度

    let xMin = width,
      xMax = 0,
      yMin = height,
      yMax = 0;

    // 遍历每个像素
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // 每个像素的 RGBA 数据索引
        const index = (y * width + x) * 4;

        const r = data[index]; // 红色通道
        const g = data[index + 1]; // 绿色通道
        const b = data[index + 2]; // 蓝色通道
        const a = data[index + 3]; // alpha 通道（透明度）

        // 判断该像素是否有颜色（alpha不为0或RGB有非零值）
        if (a !== 0 && (r !== 255 || g !== 255 || b !== 255)) {
          // 更新最小和最大坐标
          xMin = Math.min(xMin, x);
          xMax = Math.max(xMax, x);
          yMin = Math.min(yMin, y);
          yMax = Math.max(yMax, y);
        }
      }
    }

    // 如果没有找到有颜色的像素，返回一个无效的矩形
    if (xMin > xMax || yMin > yMax) {
      return [];
    }

    return [
      [Math.round(xMin / this.scale), Math.round(yMin / this.scale)],
      [Math.round(xMax / this.scale), Math.round(yMax / this.scale)]
    ];
  }

  // 提取图像的轮廓点
  getContourPointsOfColoredRegion(
    canvasData: ImageData,
    densityFactor: number = 1
  ): Point[] {
    const data = canvasData.data; // 获取图像的 RGBA 数据
    const width = canvasData.width; // 图像的宽度
    const height = canvasData.height; // 图像的高度

    const contourPoints: Point[] = [];

    // 遍历每个像素，寻找有颜色的区域，并根据阈值决定是否为轮廓点
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const r = data[index]; // 红色通道
        const g = data[index + 1]; // 绿色通道
        const b = data[index + 2]; // 蓝色通道
        const a = data[index + 3]; // alpha 通道（透明度）

        // 判断是否为轮廓点：该点周围至少有一个邻居透明度为0的点
        if (a !== 0 && (r !== 255 || g !== 255 || b !== 255)) {
          const isBorderPoint = this.isBorderPoint(x, y, width, height, data);
          if (isBorderPoint) {
            contourPoints.push([
              Math.round(x / this.scale),
              Math.round(y / this.scale)
            ]);
          }
        }
      }
    }

    // 去除重复点
    const uniquePoints = this.removeDuplicatePoints(
      contourPoints,
      false
    ).resultCoor;

    // 根据密度因子控制疏密程度
    const sampledPoints = this.samplePointsByDensity(
      uniquePoints,
      densityFactor
    );

    // 按照顺时针方向以质心为中心排序
    return this.sortByPolarAngle(sampledPoints);
  }

  // 判断一个点是否是轮廓点
  isBorderPoint(
    x: number,
    y: number,
    width: number,
    height: number,
    data: Uint8ClampedArray
  ): boolean {
    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1], // 四个方向
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1] // 四个对角线方向
    ];

    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const index = (ny * width + nx) * 4;
        const alpha = data[index + 3]; // 获取邻点的透明度
        if (alpha === 0) {
          return true; // 如果邻点是透明的，那么该点为轮廓点
        }
      }
    }
    return false;
  }

  // 根据密度因子采样轮廓点
  samplePointsByDensity(points: Point[], densityFactor: number): Point[] {
    const sampledPoints: Point[] = [];
    const step = Math.max(1, Math.floor(1 / densityFactor)); // 控制每隔多少个点采样一次

    for (let i = 0; i < points.length; i += step) {
      sampledPoints.push(points[i]);
    }

    return sampledPoints;
  }

  // 计算质心
  calculateCentroid(points: Point[]): Point {
    let sumX = 0;
    let sumY = 0;
    for (let point of points) {
      sumX += point[0];
      sumY += point[1];
    }
    const count = points.length;
    return [sumX / count, sumY / count]; // 计算质心坐标
  }

  // 计算极角
  calculatePolarAngle(center: Point, point: Point): number {
    const dx = point[0] - center[0];
    const dy = point[1] - center[1];
    return Math.atan2(dy, dx); // 返回的值是 -PI 到 PI
  }

  // 按极角排序轮廓点
  sortByPolarAngle(points: Point[]): Point[] {
    const center = this.calculateCentroid(points); // 计算质心
    return points.sort((a, b) => {
      const angleA = this.calculatePolarAngle(center, a);
      const angleB = this.calculatePolarAngle(center, b);
      return angleA - angleB; // 从小到大排序（顺时针）
    });
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
    const {
      strokeStyle,
      fillStyle,
      active,
      creating,
      coor,
      lineWidth,
      labelType
    } = shape;
    const [[x0, y0], [x1, y1]] = coor.map((a: Point) =>
      a.map((b) => Math.round(b * this.scale))
    );
    this.ctx.save();
    this.ctx.lineWidth = lineWidth || this.lineWidth;
    this.ctx.fillStyle =
      active || creating ? this.activeFillStyle : fillStyle || this.fillStyle;
    this.ctx.strokeStyle =
      active || creating
        ? this.activeStrokeStyle
        : strokeStyle || this.strokeStyle;
    const w = x1 - x0;
    const h = y1 - y0;
    if (!creating) {
      if (labelType === 1) {
        this.ctx.setLineDash([5, 5]);
      } else {
        this.ctx.setLineDash([]);
      }
      this.ctx.fillRect(x0, y0, w, h);
    }
    this.ctx.strokeRect(x0, y0, w, h);
    this.ctx.restore();
    let center = [(coor[1][0] + coor[0][0]) / 2, (coor[1][1] + coor[0][1]) / 2];
    if (labelType === 0) {
      this.drawLabel([coor[0][0], coor[0][1]] as Point, shape, "top");
    } else if (labelType === 1) {
      this.drawLabel([coor[1][0], coor[0][1]] as Point, shape, "top");
    } else {
      this.drawLabel(center as Point, shape, "center");
    }
  }

  /**
   * 绘制多边形
   * @param shape 标注实例
   */
  drawPolygon(shape: Polygon) {
    const {
      strokeStyle,
      fillStyle,
      active,
      creating,
      coor,
      lineWidth,
      labelType
    } = shape;
    this.ctx.save();
    this.ctx.lineJoin = "round";
    this.ctx.lineWidth = lineWidth || this.lineWidth;
    this.ctx.fillStyle =
      active || creating ? this.activeFillStyle : fillStyle || this.fillStyle;
    this.ctx.strokeStyle =
      active || creating
        ? this.activeStrokeStyle
        : strokeStyle || this.strokeStyle;
    if (labelType === 1) {
      this.ctx.setLineDash([5, 5]);
    } else {
      this.ctx.setLineDash([]);
    }
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
    if (shape.color === "") {
      // 关键点
      const { strokeStyle, fillStyle, active, coor, lineWidth } = shape;
      const [x, y] = coor.map((a) => a * this.scale);
      this.ctx.save();
      this.ctx.lineWidth = lineWidth || this.lineWidth;
      this.ctx.fillStyle = active
        ? this.activeFillStyle
        : fillStyle || this.ctrlFillStyle;
      this.ctx.strokeStyle = active
        ? this.activeStrokeStyle
        : strokeStyle || this.strokeStyle;
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
    const {
      strokeStyle,
      fillStyle,
      active,
      coor,
      label,
      creating,
      radius,
      ctrlsData,
      lineWidth,
      labelType
    } = shape;
    const [x, y] = coor.map((a) => a * this.scale);
    this.ctx.save();
    this.ctx.lineWidth = lineWidth || this.lineWidth;
    this.ctx.fillStyle =
      active || creating ? this.activeFillStyle : fillStyle || this.fillStyle;
    this.ctx.strokeStyle =
      active || creating
        ? this.activeStrokeStyle
        : strokeStyle || this.strokeStyle;
    this.ctx.beginPath();
    if (labelType === 1) {
      this.ctx.setLineDash([8, 10]);
    } else {
      this.ctx.setLineDash([]);
    }
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
    const { strokeStyle, active, creating, coor, lineWidth, labelType } = shape;
    this.ctx.save();
    this.ctx.lineJoin = "round";
    this.ctx.lineWidth = lineWidth || this.lineWidth;
    this.ctx.strokeStyle =
      active || creating
        ? this.activeStrokeStyle
        : strokeStyle || this.strokeStyle;
    if (labelType === 1) {
      this.ctx.setLineDash([5, 5]);
    } else {
      this.ctx.setLineDash([]);
    }
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
    if (labelType === 0) {
      this.drawLabel(coor[0], shape);
    } else {
      this.drawLabel(coor[1], shape);
    }
  }

  hexToRGBA(hex: string, alpha = 0.7) {
    // 去掉 # 号
    let hexCode = hex.replace(/^#/, "");

    // 检查输入的 hex 是否是有效的三位或六位颜色代码
    if (
      !/^[A-Fa-f0-9]{3}$/.test(hexCode) &&
      !/^[A-Fa-f0-9]{6}$/.test(hexCode)
    ) {
      return hex;
    }

    // 如果是三位颜色代码，扩展为六位
    if (hexCode.length === 3) {
      hexCode = hexCode
        .split("")
        .map((char) => char + char)
        .join("");
    }

    // 将颜色代码拆分为 R, G, B 组件
    const r = parseInt(hexCode.slice(0, 2), 16); // 提取红色部分
    const g = parseInt(hexCode.slice(2, 4), 16); // 提取绿色部分
    const b = parseInt(hexCode.slice(4, 6), 16); // 提取蓝色部分

    // 返回带有透明度的 RGBA 格式颜色
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  rgbaToHex(rgba: string, includeAlpha: boolean = false): string {
    // 去掉 rgba 前后的空格和括号
    rgba = rgba.trim().replace(/\s/g, "");
    const rgbaArray = rgba.match(
      /(\d{1,3}),(\d{1,3}),(\d{1,3}),?(\d+(\.\d+)?)?/
    );

    if (!rgbaArray) {
      return rgba; // 如果输入不是有效的 rgba 格式，返回原字符串
    }

    const r = parseInt(rgbaArray[1], 10);
    const g = parseInt(rgbaArray[2], 10);
    const b = parseInt(rgbaArray[3], 10);
    const a = rgbaArray[4] ? parseFloat(rgbaArray[4]) : 1.0;

    // 将 R, G, B 转换为两位的十六进制字符串
    const hexR = r.toString(16).padStart(2, "0");
    const hexG = g.toString(16).padStart(2, "0");
    const hexB = b.toString(16).padStart(2, "0");

    if (includeAlpha) {
      // 将透明度转换为两位的十六进制字符串
      const hexA = Math.round(a * 255)
        .toString(16)
        .padStart(2, "0");
      return `#${hexR}${hexG}${hexB}${hexA}`;
    } else {
      return `#${hexR}${hexG}${hexB}`;
    }
  }

  isRGBA(color: string): boolean {
    const rgbaRegex =
      /^rgba\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3}),\s*(0(\.\d+)?|1(\.0+)?)\)$/;
    return rgbaRegex.test(color);
  }

  removeDuplicatePoints(
    points: [number, number][],
    getBunding: boolean = false,
    removePoints: boolean = true
  ) {
    const seen = new Set();
    const uniquePoints: [number, number][] = [];
    let maxX = points[0][0],
      minX = points[0][0],
      maxY = points[0][1],
      minY = points[0][1];

    if (!removePoints) {
      if (getBunding) {
        points.forEach((point) => {
          // 计算最大最小值
          if (point[0] !== -1 && point[1] !== -1) {
            maxX = Math.max(maxX, point[0]);
            maxY = Math.max(maxY, point[1]);
            minX = Math.min(minX, point[0]);
            minY = Math.min(minY, point[1]);
          }
        });
        if (this.activeShape.type === Shape.Brush) {
          return {
            resultRect: [
              minX - this.activeShape.lineWidth / 2,
              minY - this.activeShape.lineWidth / 2,
              maxX - minX + this.activeShape.lineWidth,
              maxY - minY + this.activeShape.lineWidth
            ]
          };
        } else {
          return {
            resultRect: [minX, minY, maxX - minX, maxY - minY]
          };
        }
      }
    } else {
      if (getBunding) {
        points.forEach((point) => {
          // 坐标点去重
          const key = `${point[0]},${point[1]}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniquePoints.push(point);
          }
          // 计算最大最小值
          if (getBunding && point[0] !== -1 && point[1] !== -1) {
            maxX = Math.max(maxX, point[0]);
            maxY = Math.max(maxY, point[1]);
            minX = Math.min(minX, point[0]);
            minY = Math.min(minY, point[1]);
          }
        });
        if (this.activeShape.type === Shape.Brush) {
          return {
            resultCoor: uniquePoints,
            resultRect: [
              minX - this.brushlineWidth / 2,
              minY - this.brushlineWidth / 2,
              maxX - minX + this.brushlineWidth,
              maxY - minY + this.brushlineWidth
            ]
          };
        } else {
          return {
            resultCoor: uniquePoints,
            resultRect: [minX, minY, maxX - minX, maxY - minY]
          };
        }
      } else {
        const epsilon = 5.0;
        for (const point of points) {
          const key = `${point[0]},${point[1]}`;

          // 去重
          if (seen.has(key)) continue;

          // 若已有点，判断与前一个的距离
          const lastPoint = uniquePoints[uniquePoints.length - 1];
          if (lastPoint) {
            const dx = point[0] - lastPoint[0];
            const dy = point[1] - lastPoint[1];
            const dist = Math.hypot(dx, dy); // 等价于 sqrt(dx² + dy²)

            if (dist < epsilon) continue; // 太近，跳过
          }

          // 添加点
          seen.add(key);
          uniquePoints.push(point);
        }
        return { resultCoor: uniquePoints };
      }
    }
  }

  relEncodeBinary(
    x: number,
    y: number,
    width: number,
    height: number
  ): number[] {
    const scaledWidth = Math.round(width * this.scale);
    const scaledHeight = Math.round(height * this.scale);

    // 1. 读取放大区域原始像素
    const imageData = this.ctx.getImageData(
      Math.round(x * this.scale + this.originX),
      Math.round(y * this.scale + this.originY),
      scaledWidth,
      scaledHeight
    );

    // 2. 创建离屏canvas用于缩放回目标大小 width x height
    const offscreenBig = document.createElement("canvas");
    offscreenBig.width = scaledWidth;
    offscreenBig.height = scaledHeight;
    const bigCtx = offscreenBig.getContext("2d")!;
    bigCtx.putImageData(imageData, 0, 0);

    const offscreenSmall = document.createElement("canvas");
    offscreenSmall.width = width;
    offscreenSmall.height = height;
    const smallCtx = offscreenSmall.getContext("2d")!;
    smallCtx.drawImage(
      offscreenBig,
      0,
      0,
      scaledWidth,
      scaledHeight,
      0,
      0,
      width,
      height
    );

    // 3. 获取缩放后的像素数据（大小为 width * height）
    const scaledImageData = smallCtx.getImageData(0, 0, width, height);
    const pixelData = scaledImageData.data;

    // 4. 进行二值RLE编码（白色0，非白1）
    const result: number[] = [];
    let i = 0;

    // canvas的背景透明度<0.25，所以当获取的颜色透明度<0.25时，认为是背景色
    const isBackground = (idx: number) => pixelData[idx + 3] <= 64;

    while (i < pixelData.length) {
      const value = isBackground(i) ? 0 : 1;
      let count = 1;

      while (
        i + count * 4 < pixelData.length &&
        (isBackground(i + count * 4) ? 0 : 1) === value
      ) {
        count++;
      }

      // result.push(value, count);
      result.push(count);
      i += count * 4;
    }

    return result;
  }

  relDecodeBinary(
    encoded: number[],
    nonWhiteColor: string = "rgba(0,0,0,1)"
  ): Uint8ClampedArray {
    // 解析非白颜色
    function parseRGBA(colorStr: string): [number, number, number, number] {
      const inside = colorStr
        .trim()
        .replace(/^rgba?\(/, "")
        .replace(/\)$/, "");

      const parts = inside.split(",").map((s) => s.trim());

      if (parts.length !== 4) {
        throw new Error("颜色格式错误，应该是 rgba(R,G,B,A)");
      }

      const r = Number(parts[0]);
      const g = Number(parts[1]);
      const b = Number(parts[2]);
      let a = Number(parts[3]);

      if (
        [r, g, b].some((c) => isNaN(c) || c < 0 || c > 255) ||
        isNaN(a) ||
        a < 0 ||
        a > 1
      ) {
        throw new Error("颜色数值超出范围");
      }

      a = Math.round(a * 255);

      return [r, g, b, a];
    }

    const fillColor = parseRGBA(nonWhiteColor);

    // 计算总像素数
    // let totalPixels = 0;
    // for (let i = 1; i < encoded.length; i += 2) {
    //   totalPixels += encoded[i];
    // }

    // const pixelData = new Uint8ClampedArray(totalPixels * 4);

    // let i = 0;
    // let dataIndex = 0;

    // while (i < encoded.length) {
    //   const value = encoded[i];
    //   const count = encoded[i + 1];

    //   const color = value === 0 ? [0, 0, 0, 0] : fillColor;

    //   for (let j = 0; j < count; j++) {
    //     pixelData.set(color, dataIndex);
    //     dataIndex += 4;
    //   }

    //   i += 2;
    // }
    // 计算总像素数
    let totalPixels = 0;
    for (let i = 0; i < encoded.length; i++) {
      totalPixels += encoded[i];
    }

    const pixelData = new Uint8ClampedArray(totalPixels * 4);

    let i = 0;
    let dataIndex = 0;

    while (i < encoded.length) {
      const value = i % 2 === 0 ? 0 : 1;
      const count = encoded[i];

      const color = value === 0 ? [0, 0, 0, 0] : fillColor;

      for (let j = 0; j < count; j++) {
        pixelData.set(color, dataIndex);
        dataIndex += 4;
      }

      i++;
    }

    return pixelData;
  }

  mergeToBrushMask() {
    let minX = -1,
      minY = -1,
      maxX = -1,
      maxY = -1;
    let color = "";
    let tagId = "";
    let label = "";
    for (let i = this.dataset.length - 1; i >= 0; i--) {
      if (this.dataset[i].type === Shape.Brush) {
        const shape = this.dataset[i] as Brush;
        const [x0, y0, w, h] = shape.boundingRect;
        const x1 = x0 + w;
        const y1 = y0 + h;
        color = shape.strokeStyle;
        tagId = shape.tagId;
        label = shape.label;
        minX = minX < 0 ? x0 : minX;
        minY = minY < 0 ? x0 : minY;
        minX = Math.min(minX, x0);
        minY = Math.min(minY, y0);
        maxX = Math.max(maxX, x1);
        maxY = Math.max(maxY, y1);
        this.dataset.splice(i, 1);
      } else if (this.dataset[i].type === Shape.BrushMask) {
        const shape = this.dataset[i] as BrushMask;
        const [x0, y0] = shape.startPoint;
        const x1 = x0 + shape.width;
        const y1 = y0 + shape.height;
        color = shape.fillStyle;
        tagId = shape.tagId;
        label = shape.label;
        minX = minX < 0 ? x0 : minX;
        minY = minY < 0 ? x0 : minY;
        minX = Math.min(minX, x0);
        minY = Math.min(minY, y0);
        maxX = Math.max(maxX, x1);
        maxY = Math.max(maxY, y1);
        this.dataset.splice(i, 1);
      }
    }
    const brushMask = new BrushMask(
      {
        encodePixelData: this.relEncodeBinary(
          minX - 1,
          minY - 1,
          maxX - minX + 2,
          maxY - minY + 2
        ), // 示例的编码数据
        startPoint: [minX - 1, minY - 1], // 示例的起始点
        width: maxX - minX + 2, // 宽度
        height: maxY - minY + 2, // 高度
        fillStyle: color,
        tagId: tagId,
        label: label
      },
      this.dataset.length
    );
    console.log(brushMask);
    // this.dataset.push(brushMask);
    this.dataset.forEach((item, i) => {
      item.index = i;
    });
    this.update();
    return brushMask;
  }

  /**
   * 绘制轨迹
   * @param shape 轨迹实例
   */
  drawBrush(shape: Brush) {
    const {
      strokeStyle,
      active,
      creating,
      coor,
      lineWidth,
      iseraser,
      boundingRect
    } = shape;
    this.ctx.save();
    this.ctx.lineJoin = "round";
    this.ctx.lineCap = "round";
    this.ctx.lineWidth = lineWidth || this.brushlineWidth;

    // 应用缩放
    this.ctx.scale(this.scale, this.scale);

    if (coor.length > 1) {
      // 至少两个点才能绘制路径
      if (iseraser) {
        // 设置颜色，包含透明度
        this.ctx.strokeStyle = "rgba(255, 0, 0, 1)";
        this.ctx.fillStyle = "rgba(255, 0, 0, 1)";
        this.ctx.globalCompositeOperation = "destination-out"; // 橡皮擦效果
      } else {
        const color =
          active || creating
            ? this.activeStrokeStyle
            : strokeStyle || this.brushstrokeStyle;
        this.ctx.strokeStyle = color;
        this.ctx.fillStyle = color;
        this.ctx.globalCompositeOperation = "source-over";
      }

      this.ctx.beginPath();
      this.ctx.moveTo(coor[0][0], coor[0][1]); // 从第一个点开始

      for (let i = 1; i < coor.length; i++) {
        this.ctx.lineTo(coor[i][0], coor[i][1]); // 绘制到下一个点
      }

      this.ctx.stroke();

      // if (active && boundingRect.length > 0) {
      //   const [x, y, w, h] = boundingRect;
      //   this.ctx.lineWidth = 1;
      //   this.ctx.strokeStyle = this.activeStrokeStyle;
      //   this.ctx.beginPath();
      //   this.ctx.strokeRect(x, y, w, h);
      //   this.ctx.stroke();
      // }
    }
    this.ctx.restore();
  }

  drawBrushMask(shape: BrushMask) {
    const { encodePixelData, startPoint, height, width, fillStyle } = shape;

    // 1. 解码得到原始大小的像素数据（未缩放）
    const pixelData = this.relDecodeBinary(encodePixelData, fillStyle);

    // 2. 创建 ImageData，大小是原始 width, height
    const imageData = new ImageData(pixelData, width, height);

    // 3. 创建离屏 canvas，绘制 ImageData
    const offCanvas = document.createElement("canvas");
    offCanvas.width = width;
    offCanvas.height = height;
    const offCtx = offCanvas.getContext("2d");
    offCtx.putImageData(imageData, 0, 0);

    // 4. 将离屏 canvas 绘制到目标 ctx，并通过 drawImage 缩放
    this.ctx.drawImage(
      offCanvas,
      0,
      0,
      width,
      height,
      startPoint[0] * this.scale,
      startPoint[1] * this.scale,
      width * this.scale,
      height * this.scale
    );
  }

  /**
   * 绘制网格
   * @param shape 标注实例
   * @returns
   */
  drawGrid(shape: Grid) {
    if (shape.coor.length !== 2) return;
    const { strokeStyle, fillStyle, active, creating, coor, lineWidth } = shape;
    const [[x0, y0], [x1, y1]] = coor.map((a: Point) =>
      a.map((b) => Math.round(b * this.scale))
    );
    this.ctx.save();
    this.ctx.lineWidth = lineWidth || this.lineWidth;
    this.ctx.fillStyle =
      active || creating ? this.activeFillStyle : fillStyle || this.fillStyle;
    this.ctx.strokeStyle =
      active || creating
        ? this.activeStrokeStyle
        : strokeStyle || this.strokeStyle;
    shape.gridRects.forEach((rect: Rect, m) => {
      this.drawRect(rect, {
        selectedFillStyle:
          shape.selectedFillStyle || this.gridSelectedFillStyle,
        isSelected: shape.selected?.includes(m)
      });
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
      if (
        (shape.type === Shape.Polygon || shape.type === Shape.Line) &&
        (i === this.ctrlIndex || i === this.clickIndex)
      ) {
        this.ctrlStrokeStyle = "red";
        this.ctrlRadius = 5;
      } else {
        this.ctrlStrokeStyle = "#000";
        this.ctrlRadius = 3;
      }
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
      throw new Error("Points array cannot be empty.");
    }

    const sum = points.reduce(
      (acc, [x, y]) => {
        acc[0] += x; // 累加 x 坐标
        acc[1] += y; // 累加 y 坐标
        return acc;
      },
      [0, 0]
    );

    const centerX = sum[0] / points.length; // 计算平均 x 坐标
    const centerY = sum[1] / points.length; // 计算平均 y 坐标

    return [centerX, centerY] as Point; // 返回中心坐标
  }

  getImagedataFromImageClass = (
    image: HTMLImageElement,
    masktype: string
  ): Uint8ClampedArray | null => {
    // 创建一个临时的 canvas 元素用于处理图像
    const maskCanvas = document.createElement("canvas");
    const maskContext = maskCanvas.getContext("2d", {
      willReadFrequently: true
    });

    if (!maskCanvas || !maskContext) {
      console.error("Canvas or context is not initialized");
      return null;
    }

    maskCanvas.width = this.WIDTH;
    maskCanvas.height = this.HEIGHT;

    // 将图像绘制到临时 canvas 上
    const tmpCanvas = document.createElement("canvas");
    const tmpContext = tmpCanvas.getContext("2d", { willReadFrequently: true });

    if (!tmpContext) {
      console.error("Temporary canvas context is not initialized");
      return null;
    }

    tmpCanvas.width = this.WIDTH;
    tmpCanvas.height = this.HEIGHT;
    tmpContext.drawImage(image, 0, 0);

    let imageData = tmpContext?.getImageData(
      0,
      0,
      tmpCanvas.width,
      tmpCanvas.height
    );
    let pixelData = imageData?.data;

    if (!pixelData) {
      console.error("Failed to retrieve pixel data");
      return null;
    }

    // 获取 maskCanvas 的图像数据
    const imageMask = maskContext.getImageData(0, 0, this.WIDTH, this.HEIGHT);
    const maskData = imageMask.data;

    // 根据 masktype 处理图像数据
    if (masktype === "everything") {
      for (let i = 0; i < pixelData.length; i += 4) {
        if (pixelData[i] > 0) {
          const colorIndex = pixelData[i] % this.random_color.length;
          maskData[i] = this.random_color[colorIndex].r; // red
          maskData[i + 1] = this.random_color[colorIndex].g; // green
          maskData[i + 2] = this.random_color[colorIndex].b; // blue
          maskData[i + 3] = this.mask_alpha; // alpha
        }
      }
      maskContext.putImageData(imageMask, 0, 0);
    } else if (masktype === "rect") {
    } else if (masktype === "magic") {
      let pixels = [];
      // Get the pixel indices of the mask
      for (let i = 0; i < pixelData.length; i += 4) {
        if (
          pixelData[i] == 255 &&
          pixelData[i + 1] == 255 &&
          pixelData[i + 2] == 255
        ) {
          pixels.push(i);
        }
      }
    } else {
      console.error("Unknown mask type");
      return null;
    }

    // 创建一个新的 canvas 元素并绘制缩放后的图像
    const scaledCanvas = document.createElement("canvas");
    const scaledContext = scaledCanvas.getContext("2d", {
      willReadFrequently: true
    });

    if (!scaledContext) {
      console.error("Scaled canvas context is not initialized");
      return null;
    }

    scaledCanvas.width = this.IMAGE_WIDTH;
    scaledCanvas.height = this.IMAGE_HEIGHT;
    scaledContext.drawImage(image, 0, 0, this.IMAGE_WIDTH, this.IMAGE_HEIGHT);

    // 获取缩放后的图像数据
    const scaledImageData = scaledContext.getImageData(
      0,
      0,
      this.IMAGE_WIDTH,
      this.IMAGE_HEIGHT
    );
    return scaledImageData.data;
  };

  putDataOnCanvas(
    thisCanvas: HTMLCanvasElement,
    pixels: number[],
    fillStyle: string,
    putImageData: boolean = true
  ) {
    const thisContext = thisCanvas.getContext("2d", {
      willReadFrequently: true
    });
    if (!thisContext) {
      return;
    }
    const canvasData = thisContext.getImageData(
      this.originX,
      this.originY,
      this.IMAGE_WIDTH,
      this.IMAGE_HEIGHT
    );
    const data = canvasData.data;
    const rgbaRegex = /rgba?\((\d+), (\d+), (\d+)(?:, ([0-9.]+))?\)/;
    const replacementColor = fillStyle.match(rgbaRegex);

    for (let i = 0; i < pixels.length; i += 1) {
      data[pixels[i]] = parseInt(replacementColor[1], 10); // red
      data[pixels[i] + 1] = parseInt(replacementColor[2], 10); // green
      data[pixels[i] + 2] = parseInt(replacementColor[3], 10); // blue
      data[pixels[i] + 3] =
        (replacementColor[4] !== undefined
          ? parseFloat(replacementColor[4])
          : 0.5) * 255; // alpha
    }
    if (putImageData) {
      thisContext.putImageData(canvasData, this.originX, this.originY);
    }
    return canvasData;
  }

  drawPromptPointOnClick = (
    thisPrompt: MagicPoint,
    canvas: HTMLCanvasElement
  ): void => {
    const x = thisPrompt.coor[0] * this.scale;
    const y = thisPrompt.coor[1] * this.scale;

    const fillColor = `rgba(255, 255, 255, 0.75)`;
    const strokeColor = thisPrompt.color;

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
   * 高亮Mask
   * @param index Mask的索引
   * @param highlight 是否高亮
   * @returns
   */
  highlightMask(index: number) {
    let activeColor = "";
    if (index > -1) {
      const shape = this.dataset[index];
      activeColor = shape.fillStyle.replace(
        /rgba\((\d+), (\d+), (\d+), (\d+(\.\d+)?)\)/,
        (match, r, g, b, a) => {
          return `rgba(${r}, ${g}, ${b}, 0.75)`;
        }
      );
      shape.fillStyle = activeColor;
      // this.update();
    } else {
      // let state = false;
      for (let i = 0; i < this.dataset.length; i++) {
        if (this.dataset[i].type === Shape.Mask) {
          activeColor = this.dataset[i].fillStyle.replace(
            /rgba\((\d+), (\d+), (\d+), (\d+(\.\d+)?)\)/,
            (match, r, g, b, a) => {
              return `rgba(${r}, ${g}, ${b}, 0.5)`;
            }
          );
          this.dataset[i].fillStyle = activeColor;
          // state = true;
        }
      }
      // if(state){
      //     this.update();
      // }
    }
    this.update(); // 此处，一方面用于更新Mask高亮；另一方面用于更新控制点加粗变红
  }

  changeMaskPolygon(densityFactor: number) {
    const polygonShape = this.dataset.find(
      (item) => item.uuid === this.activePolygon
    );
    polygonShape.coor = this.getContourPointsOfColoredRegion(
      this.activeCanvasData,
      densityFactor
    );
    this.update();
  }

  endMagicTool() {
    this.manageDoneList(deepClone(this.dataset));
  }

  /**
   * 绘制Mask
   * @param shape 标注实例
   * @returns
   */
  drawMask(shape: Mask) {
    if (
      shape.pixels.length !== 0 &&
      shape.height === this.IMAGE_HEIGHT &&
      shape.weight === this.IMAGE_WIDTH
    ) {
      this.putDataOnCanvas(this.canvas, shape.pixels, shape.fillStyle);
      // console.log(shape.pixels);
      return;
    }
    const maskBase64 = shape.maskBase64;
    // 将 base64 转换为图像
    const maskImage = new Image();
    maskImage.crossOrigin = "Anonymous";
    maskImage.src = `data:image/png;base64,${maskBase64}`;

    const self = this;

    // 处理图像数据
    maskImage.onload = () => {
      if (shape.maskType === "everything") {
        const pixelData = self.getImagedataFromImageClass(
          maskImage,
          "everything"
        );

        if (pixelData) {
          const canvasData = self.ctx.getImageData(
            self.originX,
            self.originY,
            self.IMAGE_WIDTH,
            self.IMAGE_HEIGHT
          );
          const data = canvasData.data;

          // 遍历图像像素并修改对应的颜色
          for (let i = 0; i < pixelData.length; i += 4) {
            if (pixelData[i] > 0) {
              const color =
                self.random_color[pixelData[i] % self.random_color.length];
              data[i] = color.r; // red
              data[i + 1] = color.g; // green
              data[i + 2] = color.b; // blue
              data[i + 3] = this.mask_alpha; // alpha
            }
          }

          // 更新 canvas 上的图像数据
          self.ctx.putImageData(canvasData, self.originX, self.originY);
        }
      } else if (shape.maskType === "click") {
        const pixels: number[] = []; // 保存所有符合条件的像素的索引位置
        const pixelData = self.getImagedataFromImageClass(maskImage, "magic");

        if (pixelData) {
          for (let i = 0; i < pixelData.length; i += 4) {
            if (
              pixelData[i] === 255 &&
              pixelData[i + 1] === 255 &&
              pixelData[i + 2] === 255
            ) {
              pixels.push(i);
            }
          }

          shape.pixels = pixels;
          shape.height = self.IMAGE_HEIGHT;
          shape.weight = self.IMAGE_WIDTH;
          shape.fillStyle = shape.strokeStyle;

          shape.canvasData = self.putDataOnCanvas(
            self.canvas,
            pixels,
            shape.fillStyle
          );
        } else {
          console.error("Failed to get pixel data from mask image");
        }
      } else {
      }
    };
  }

  addPoint() {
    const shape = this.activeShape;
    if (
      Object.keys(shape).length !== 0 &&
      this.clickIndex > -1 &&
      !this.readonly
    ) {
      const [x, y] = this.activeShape.coor[this.clickIndex];
      let nx = Math.ceil(x + 5);
      let ny = Math.ceil(y + 5);
      if (nx > this.IMAGE_ORIGIN_WIDTH) {
        nx = Math.ceil(x - 5);
      }
      if (ny > this.IMAGE_ORIGIN_HEIGHT) {
        ny = Math.ceil(y - 5);
      }
      shape.coor.splice(this.clickIndex + 1, 0, [nx, ny]);
      this.clickIndex++;
      this.update();
      this.manageDoneList(deepClone(this.dataset));
    }
  }

  deletePoint() {
    const shape = this.activeShape;
    if (
      Object.keys(shape).length !== 0 &&
      shape.coor.length > 3 &&
      this.clickIndex > -1 &&
      !this.readonly
    ) {
      shape.coor.splice(this.clickIndex, 1);
      this.update();
      this.manageDoneList(deepClone(this.dataset));
      this.clickIndex = -1;
    }
  }

  /**
   * 绘制路径线段
   * @param shape 标注实例
   * @returns
   */
  drawPencil(shape: Pencil) {
    const {
      strokeStyle,
      fillStyle,
      active,
      creating,
      coor,
      // innerCoor,
      lineWidth
    } = shape;

    this.ctx.save();

    this.ctx.lineJoin = "round";
    this.ctx.lineCap = "round";
    this.ctx.lineWidth = lineWidth || this.pencillineWidth;

    const strokeColor =
      active || creating
        ? this.activeStrokeStyle
        : strokeStyle || this.pencilstrokeStyle;
    const fillColor =
      active || creating
        ? this.activeFillStyle
        : fillStyle || this.pencilstrokeStyle;

    this.ctx.scale(this.scale, this.scale);

    this.ctx.beginPath();

    // --- 检查是否已完成（包含 -1, -1）
    const isClosed = coor.some((pt) => pt[0] === -1 && pt[1] === -1);

    // --- 分段绘制函数 ---
    const drawPathSegments = (points: [number, number][]) => {
      let segment: [number, number][] = [];

      for (const point of points) {
        if (point[0] === -1 && point[1] === -1) {
          if (segment.length > 1) {
            this.ctx.moveTo(segment[0][0], segment[0][1]);
            for (let i = 1; i < segment.length; i++) {
              this.ctx.lineTo(segment[i][0], segment[i][1]);
            }
            this.ctx.closePath();
          }
          segment = [];
        } else {
          segment.push(point);
        }
      }

      // 最后一段（未结束）
      if (segment.length > 1) {
        this.ctx.moveTo(segment[0][0], segment[0][1]);
        for (let i = 1; i < segment.length; i++) {
          this.ctx.lineTo(segment[i][0], segment[i][1]);
        }
        if (isClosed) this.ctx.closePath(); // 仅当闭合才首尾闭合
      }
    };

    // --- 绘制 coor 主路径 ---
    if (coor?.length) {
      drawPathSegments(coor);
    }

    // // --- 绘制 innerCoor 镂空路径（仅当已闭合）---
    // if (isClosed && innerCoor && Array.isArray(innerCoor)) {
    //   for (const hole of innerCoor) {
    //     if (hole?.length) {
    //       drawPathSegments(hole);
    //     }
    //   }
    // }

    // --- 仅闭合状态下填充 ---
    if (isClosed) {
      this.ctx.fillStyle = fillColor;
      this.ctx.fill("evenodd");
    }

    // 始终描边
    this.ctx.strokeStyle = strokeColor;
    this.ctx.stroke();

    this.ctx.restore();
  }

  /**
   * 绘制label
   * @param point 位置
   * @param label 文本
   */
  drawLabel(point: Point, shape: AllShape, location: String = "center") {
    const {
      label = "",
      labelFillStyle = "",
      labelFontFamily = "",
      textFillStyle = "",
      hideLabel,
      labelUp,
      lineWidth,
      coor
    } = shape;

    if (
      !label.length ||
      (typeof hideLabel === "boolean" ? hideLabel : this.hideLabel)
    )
      return;

    const textPadding = { left: 4, top: 4 };
    const newText =
      label.length <= this.labelMaxLen
        ? label
        : `${label.slice(0, this.labelMaxLen)}...`;

    // 设置字体缩放比例
    const scaleFactor =
      (this.textscaleStep >= 0 ? 1.1 : 0.9) ** Math.abs(this.textscaleStep);
    this.ctx.font = `${this.labelFontSize * scaleFactor}px ${
      labelFontFamily || "sans-serif"
    }`;

    const textMetrics = this.ctx.measureText(newText);
    const labelWidth = textMetrics.width + textPadding.left * 2;
    const labelHeight = parseInt(this.ctx.font) - 4 + textPadding.top * 2;

    const currLineWidth = lineWidth || this.lineWidth;
    const isLabelUp = typeof labelUp === "boolean" ? labelUp : this.labelUp;

    const toLeft = this.IMAGE_ORIGIN_WIDTH - point[0] < labelWidth / this.scale;
    const toTop =
      this.IMAGE_ORIGIN_HEIGHT - point[1] < labelHeight / this.scale;
    const toTop2 = point[1] > labelHeight / this.scale;
    const isUp = isLabelUp ? toTop2 : toTop;

    this.ctx.save();
    this.ctx.fillStyle = labelFillStyle || this.labelFillStyle;

    let [x, y] = point.map((a) => a * this.scale);

    // 以 point 为中心创建 label
    if ([1, 2, 5].includes(shape.type)) {
      x -= labelWidth / 2;
      if (location === "top") {
        y -= labelHeight;
      } else if (location === "bottom") {
      } else {
        y -= labelHeight / 2;
      }
    }

    // 计算矩形位置
    const rectX = toLeft
      ? x - textMetrics.width - textPadding.left + currLineWidth / 2
      : x + currLineWidth / 2;
    const rectY = isUp
      ? y - labelHeight - currLineWidth / 2
      : y + currLineWidth / 2;

    // 计算缩放后的矩形大小
    const rectWidth = labelWidth;
    const rectHeight = labelHeight;
    this.ctx.fillRect(rectX, rectY, rectWidth, rectHeight);

    // 设置文本样式
    this.ctx.fillStyle = textFillStyle || this.textFillStyle;
    this.ctx.textBaseline = "middle";

    // 计算文本绘制位置
    const textX = rectX + (rectWidth - textMetrics.width) / 2;
    const textY = rectY + rectHeight / 2;

    // 绘制文本
    this.ctx.fillText(newText, textX, textY, rectWidth);
    this.ctx.restore();
  }

  /**
   * 更新画布
   */
  update(toMask: boolean = false, initSize: boolean = false) {
    window.cancelAnimationFrame(this.timer);
    if (initSize) {
      this.initZoom();
    }
    this.timer = window.requestAnimationFrame(() => {
      this.ctx.save();
      this.ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);
      this.ctx.translate(this.originX, this.originY); // 位置映射，（0,0）对应着（this.originX, this.originY）
      if (this.IMAGE_WIDTH && this.IMAGE_HEIGHT) {
        if (toMask) {
          // 获取图像的像素数据
          const imageData = this.ctx.getImageData(
            0,
            0,
            this.IMAGE_WIDTH,
            this.IMAGE_HEIGHT
          );
          const data = imageData.data;

          // 将所有像素的 RGB 值设置为 0 (黑色)
          for (let i = 0; i < data.length; i += 4) {
            data[i] = 0; // Red
            data[i + 1] = 0; // Green
            data[i + 2] = 0; // Blue
            data[i + 3] = 255; // alpha
          }

          // 将修改后的像素数据重新放回画布
          this.ctx.putImageData(imageData, this.originX, this.originY);
        } else {
          // console.log("this.imagesrc", this.image.src);
          // console.log("this.image1", this.image);
          if (!this.image.src.includes("undefined")) {
            if (this.imagealpha === 1) {
              this.ctx.drawImage(
                this.image,
                0,
                0,
                this.IMAGE_WIDTH,
                this.IMAGE_HEIGHT
              );
            } else {
              // this.ctx.globalAlpha = this.imagealpha;
              // this.ctx.drawImage(
              //   this.image,
              //   0,
              //   0,
              //   this.IMAGE_WIDTH,
              //   this.IMAGE_HEIGHT
              // );
              // this.ctx.globalAlpha = 1.0;
            }
          }
        }
      }
      // 专注模式下，只显示选中图形
      const renderList = this.focusMode
        ? this.activeShape.type
          ? [this.activeShape]
          : []
        : this.dataset;
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
          case Shape.BrushMask:
            this.drawBrushMask(shape as BrushMask);
            break;
          case Shape.Mask:
            this.drawMask(shape as Mask);
            break;
          case Shape.Pencil:
            this.drawPencil(shape as Pencil);
            break;
          default:
            break;
        }
      }
      if (
        [
          Shape.Rect,
          Shape.Polygon,
          Shape.Line,
          Shape.Circle,
          Shape.Grid
        ].includes(this.activeShape.type) &&
        !this.activeShape.hiddening
      ) {
        this.drawCtrlList(this.activeShape);
      }
      // 绘制智能标注点
      if (this.magicPoints.length) {
        for (const thisPrompt of this.magicPoints) {
          this.drawPromptPointOnClick(thisPrompt, this.canvas);
        }
      }
      this.ctx.restore();
      this.emit("updated", this.dataset);
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
      // this.manageDoneList(deepClone(this.dataset));
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
      // this.manageDoneList(deepClone(this.dataset));
    }
  }

  /**
   * 删除指定矩形
   * @param index number
   */
  deleteByIndex(index: number) {
    const num = this.dataset.findIndex((x) => x.index === index);
    if (num > -1) {
      this.emit("delete", this.dataset[num]);
      this.dataset.splice(num, 1);
      this.dataset.forEach((item, i) => {
        item.index = i;
      });
      this.update();
      this.manageDoneList(deepClone(this.dataset));
      // this.manageDoneList(deepClone(this.dataset));
    }
  }

  /**
   * 修改选中图像的标注信息
   * @param tagId string
   * @param label string
   * @param color string
   */
  updateLabelByIndex(
    index: number,
    tagId: string,
    label: string,
    color: string,
    properties: string[]
  ) {
    const updateProperties = (item: any) => {
      properties.forEach((prop) => {
        if (prop === "label") {
          item.label = label;
        } else if (prop === "tagId") {
          item.tagId = tagId;
        } else if (prop === "strokeStyle") {
          // if(item.type === 7 && this.isRGBA(color)){
          //     item.strokeStyle = this.rgbaToHex(color);
          // } else {
          item.strokeStyle = color;
          // }
        } else if (prop === "textFillStyle") {
          item.textFillStyle = color;
        } else if (prop === "fillStyle") {
          // if(item.type === 7 && this.isRGBA(color)){
          //     item.fillStyle = this.rgbaToHex(color);
          // } else {
          item.fillStyle = color;
          // }
        }
      });
    };

    if (index !== -1) {
      updateProperties(this.dataset[index]);
      if (this.dataset[index].type === Shape.Pencil) {
        this.emit("updateLabel", this.dataset[index]);
      }
    } else {
      // 注意:不能使用if(this.activeShape)判断，会始终为true
      if (Object.keys(this.activeShape).length !== 0) {
        updateProperties(this.activeShape);
        if (this.activeShape.type === Shape.Pencil) {
          this.emit("updateLabel", this.activeShape);
        }
      }
    }

    this.update();
    this.manageDoneList(deepClone(this.dataset));
  }

  /**
   * 删除画布中创建的所有图形
   * @param index number
   */
  deleteAllShape() {
    this.dataset = [];
    this.update();
    this.manageDoneList(deepClone(this.dataset));
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
          if (
            this.isPointInBackground([
              x + width * this.scale,
              y + height * this.scale
            ])
          ) {
            // 如果鼠标区域为左上角，右下角未超出
            newItem.coor[0] = [
              (x - this.originX) / this.scale,
              (y - this.originY) / this.scale
            ];
            newItem.coor[1] = [
              (x - this.originX) / this.scale + width,
              (y - this.originY) / this.scale + height
            ];
          } else if (
            this.isPointInBackground([
              x - width * this.scale,
              y - height * this.scale
            ])
          ) {
            // 如果鼠标区域为右下角，左上角未超出
            newItem.coor[0] = [
              (x - this.originX) / this.scale - width,
              (y - this.originY) / this.scale - height
            ];
            newItem.coor[1] = [
              (x - this.originX) / this.scale,
              (y - this.originY) / this.scale
            ];
          } else if (
            this.isPointInBackground([
              x + width * this.scale,
              y - height * this.scale
            ])
          ) {
            // 如果鼠标区域为左下角，右上角未超出
            newItem.coor[0] = [
              (x - this.originX) / this.scale,
              (y - this.originY) / this.scale - height
            ];
            newItem.coor[1] = [
              (x - this.originX) / this.scale + width,
              (y - this.originY) / this.scale
            ];
          } else if (
            this.isPointInBackground([
              x - width * this.scale,
              y + height * this.scale
            ])
          ) {
            // 如果鼠标区域为右上角，左下角未超出
            newItem.coor[0] = [
              (x - this.originX) / this.scale - width,
              (y - this.originY) / this.scale
            ];
            newItem.coor[1] = [
              (x - this.originX) / this.scale,
              (y - this.originY) / this.scale + height
            ];
          } else {
            return;
          }
        } else {
          return;
        }
        newItem.uuid = createUuid();
        this.dataset.push(newItem); // 添加到 dataset 中
        this.dataset[num].active = false;
        this.dataset.forEach((item, i) => {
          item.index = i;
        });
        this.update();
        this.manageDoneList(deepClone(this.dataset));
      } else if (this.activeShape.type === Shape.Dot) {
        const newItem = deepClone(this.dataset[num]);
        const [x, y] = this.mouse || [];
        if (this.isPointInBackground(this.mouse)) {
          newItem.coor[0] = (x - this.originX) / this.scale;
          newItem.coor[1] = (y - this.originY) / this.scale;
          // 防止位置重叠
          if (
            newItem.coor[0] == this.dataset[num].coor[0] &&
            newItem.coor[1] == this.dataset[num].coor[1]
          ) {
            newItem.coor[0] += 2;
            newItem.coor[1] += 2;
          }
        } else {
          return;
        }
        newItem.uuid = createUuid();
        this.dataset.push(newItem); // 添加到 dataset 中
        this.dataset[num].active = false;
        this.dataset.forEach((item, i) => {
          item.index = i;
        });
        this.update();
        this.manageDoneList(deepClone(this.dataset));
      } else if (this.activeShape.type === Shape.Circle) {
        const newItem = new Circle(
          {
            ...this.dataset[num], // 复制所有简单属性
            coor: [...this.dataset[num].coor], // 深拷贝数组
            radius: this.activeShape.radius // 深拷贝 radius
          },
          this.dataset[num].index
        );
        const [x, y] = this.mouse || [];
        if (this.isPointInBackground(this.mouse)) {
          newItem.coor[0] = (x - this.originX) / this.scale;
          newItem.coor[1] = (y - this.originY) / this.scale;
          let point1: Point = [x - newItem.radius, y]; //左顶点
          let point2: Point = [x + newItem.radius, y]; //右顶点
          let point3: Point = [x, y - newItem.radius]; //上顶点
          let point4: Point = [x, y + newItem.radius]; //下顶点
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
        this.dataset.forEach((item, i) => {
          item.index = i;
        });
        this.update();
        this.manageDoneList(deepClone(this.dataset));
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
  // calcStep(flag = "") {
  //   console.log("calcStep");
  //   // 如果图片小于指定的宽高，且 flag 为空或 'b'，执行放大操作
  //   if (this.IMAGE_WIDTH < this.WIDTH && this.IMAGE_HEIGHT < this.HEIGHT) {
  //     if (flag === "" || flag === "b") {
  //       this.setScale(true, false, true); // 执行放大
  //       // 仅在没有递归过的情况下才继续递归
  //       if (flag !== "b") {
  //         this.calcStep("b"); // 递归调用，避免重复递归
  //       }
  //     }
  //   }

  //   // 如果图片大于指定的宽高，且 flag 为空或 's'，执行缩小操作
  //   if (this.IMAGE_WIDTH > this.WIDTH || this.IMAGE_HEIGHT > this.HEIGHT) {
  //     if (flag === "" || flag === "s") {
  //       this.setScale(false, false, true); // 执行缩小
  //       // 仅在没有递归过的情况下才继续递归
  //       if (flag !== "s") {
  //         this.calcStep("s"); // 递归调用，避免重复递归
  //       }
  //     }
  //   }
  //   return;
  // }
  calcStep(flag = "") {
    if (this.IMAGE_WIDTH < this.WIDTH && this.IMAGE_HEIGHT < this.HEIGHT) {
      if (flag === "" || flag === "b") {
        this.setScale(true, false, true);
        this.calcStep("b");
      }
    }
    if (this.IMAGE_WIDTH > this.WIDTH || this.IMAGE_HEIGHT > this.HEIGHT) {
      if (flag === "" || flag === "s") {
        this.setScale(false, false, true);
        this.calcStep("s");
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
    if (
      (!type && this.imageMin < this.MIN_LENGTH) ||
      (type && this.IMAGE_WIDTH > this.imageOriginMax * 10)
    )
      return;
    if (type) {
      this.scaleStep++;
    } else {
      this.scaleStep--;
    }
    let realToLeft = 0;
    let realToRight = 0;
    const [x, y] = this.mouse || [];
    if (byMouse) {
      realToLeft = (x - this.originX) / this.scale;
      realToRight = (y - this.originY) / this.scale;
    }
    const abs = Math.abs(this.scaleStep);
    const width = this.IMAGE_WIDTH;
    this.IMAGE_WIDTH = Math.round(
      this.IMAGE_ORIGIN_WIDTH * (this.scaleStep >= 0 ? 1.1 : 0.9) ** abs
    );
    this.IMAGE_HEIGHT = Math.round(
      this.IMAGE_ORIGIN_HEIGHT * (this.scaleStep >= 0 ? 1.1 : 0.9) ** abs
    );
    if (byMouse) {
      this.originX = x - realToLeft * this.scale;
      this.originY = y - realToRight * this.scale;
    } else {
      const scale = this.IMAGE_WIDTH / width;
      this.originX = this.WIDTH / 2 - (this.WIDTH / 2 - this.originX) * scale;
      this.originY = this.HEIGHT / 2 - (this.HEIGHT / 2 - this.originY) * scale;
    }
    this.emit("scale", { type: type, byMouse: byMouse, pure: pure });
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
      this.IMAGE_WIDTH =
        this.IMAGE_ORIGIN_WIDTH / (this.IMAGE_ORIGIN_HEIGHT / this.HEIGHT);
      this.IMAGE_HEIGHT = this.HEIGHT;
    } else {
      this.IMAGE_WIDTH = this.WIDTH;
      this.IMAGE_HEIGHT =
        this.IMAGE_ORIGIN_HEIGHT / (this.IMAGE_ORIGIN_WIDTH / this.WIDTH);
    }
    this.originX = (this.WIDTH - this.IMAGE_WIDTH) / 2;
    this.originY = (this.HEIGHT - this.IMAGE_HEIGHT) / 2;
    this.textscaleStep = 0;
    this.emit("fitZoom");
    this.update();
  }

  /**
   * 恢复为原始图片尺寸
   */
  initZoom() {
    // this.calcStep();
    this.IMAGE_WIDTH = this.IMAGE_ORIGIN_WIDTH;
    this.IMAGE_HEIGHT = this.IMAGE_ORIGIN_HEIGHT;
    this.originX = (this.WIDTH - this.IMAGE_WIDTH) / 2;
    this.originY = (this.HEIGHT - this.IMAGE_HEIGHT) / 2;
    this.textscaleStep = 0;
    // this.update();
  }

  /**
   * 设置专注模式
   * @param type {boolean}
   */
  setFocusMode(type: boolean) {
    this.focusMode = type;
    this.update();
    // this.manageDoneList(deepClone(this.dataset));
  }

  manageDoneList(dataset: AllShape[]) {
    this.doneList.push(dataset);
    if (this.doneList.length > this.MAX_LENGTH) {
      this.doneList.shift();
    }
  }

  /**
   * 撤销操作（目前不支持撤销隐藏、显示、专注等模式和状态切换）
   * 若支持，需要设置一个操作数组，每次往doneList中push时，记录下操作类型。撤销时，执行相应的逆方法
   */
  undo() {
    if (this.doneList.length > 1) {
      this.clickIndex = -1; // 重置点击索引
      const lastDoneItem = this.doneList[this.doneList.length - 1];
      this.undoList.push(lastDoneItem);
      this.doneList.pop();
      const newShapes = deepClone(this.doneList[this.doneList.length - 1]);
      this.setData(newShapes, false);
    }
  }

  /**
   * 重做操作
   */
  redo() {
    if (this.undoList.length > 0) {
      this.clickIndex = -1; // 重置点击索引
      const lastDoneItem = this.undoList[this.undoList.length - 1];
      this.manageDoneList(lastDoneItem);
      this.undoList.pop();
      const newShapes = deepClone(this.doneList[this.doneList.length - 1]);
      this.setData(newShapes, false);
    }
  }

  /**
   * 销毁
   */
  destroy() {
    if (!this.canvas) return;
    this.image.removeEventListener("load", this.handleLoad);
    this.canvas.removeEventListener("contextmenu", this.handleContextmenu);
    this.canvas.removeEventListener("mousewheel", this.handleMousewheel);
    this.canvas.removeEventListener("wheel", this.handleMousewheel);
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    this.canvas.removeEventListener("touchstart", this.handleMouseDown);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    this.canvas.removeEventListener("touchmove", this.handleMouseMove);
    this.canvas.removeEventListener("mouseup", this.handleMouseUp);
    this.canvas.removeEventListener("touchend", this.handleMouseUp);
    this.canvas.removeEventListener("dblclick", this.handleDblclick);
    document.body.removeEventListener("keydown", this.handleKeydown, true);
    document.body.removeEventListener("keyup", this.handleKeyup, true);
    this.canvas.width = this.WIDTH;
    this.canvas.height = this.HEIGHT;
    this.canvas.style.width = null;
    this.canvas.style.height = null;
    this.canvas.style.userSelect = null;
  }

  /**
   * 重新设置画布大小
   */
  resize(
    width: number,
    height: number,
    alpha: number = 1,
    imageurl: string = ""
  ) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = String(width) + "px";
    this.canvas.style.height = String(height) + "px";
    if (imageurl !== "" || this.imagesrc === undefined) {
      this.imagesrc = imageurl;
    }
    this.setImage(this.imagesrc, alpha);
    this.initSetting();
    this.update();
  }
}
