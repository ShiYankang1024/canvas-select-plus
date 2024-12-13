import Shape from "./shape/Shape";

export function createUuid(): string {
  const s: any[] = [];
  const hexDigits = "0123456789abcdef";
  for (let i = 0; i < 36; i++) {
    const m = Math.floor(Math.random() * 0x10);
    s[i] = hexDigits.slice(m, m + 1);
  }
  s[14] = "4";
  const n = (s[19] & 0x3) | 0x8;
  s[19] = hexDigits.slice(n, n + 1);
  s[8] = s[13] = s[18] = s[23] = "-";
  const uuid = s.join("");
  return uuid;
}

/**
 * 判断图形是否符合嵌套关系, 业务需求：只需要判断shape2所有的点是否都在shape1内部即可
 * @param shape1 参数1
 * @param shape2 参数2
 * @reutrn Boolean 符合条件返回true 否则返回false
 */

export function isNested(shape1: any, shape2: any): boolean {
  if (shape1.type === 1 && shape2.type === 1) {
    // 矩形和矩形的判断逻辑
    const [[x1, y1], [x2, y2]] = shape1.coor;
    const [[x3, y3], [x4, y4]] = shape2.coor;

    // if (x1 >= x3 && y1 >= y3 && x2 <= x4 && y2 <= y4) {
    //   return true; // shape1 嵌套在 shape2 内部
    // } else
    if (x1 <= x3 && y1 <= y3 && x2 >= x4 && y2 >= y4) {
      return true; // shape2 嵌套在 shape1 内部
    } else {
      return false; // 两个矩形没有嵌套关系
    }
  } else if (shape1.type === 1 && shape2.type === 2) {
    // 矩形和多边形的判断逻辑，确保多边形所有的坐标点都在矩形里面
    const [[x1, y1], [x2, y2]] = shape1.coor;
    const vertices = shape2.coor;

    for (let i = 0; i < vertices.length; i++) {
      const [x, y] = vertices[i];
      if (x < x1 || x > x2 || y < y1 || y > y2) {
        return false; // 多边形的顶点在矩形外部，不嵌套
      }
    }

    return true; // 所有顶点都在矩形内部，嵌套关系成立
  } else if (shape1.type === 2 && shape2.type === 1) {
    // 多边形和矩形的判断逻辑，确保矩形的所有坐标点都在多边形里面
    const vertices = shape2.coor; // 矩形的顶点坐标

    for (let i = 0; i < vertices.length; i++) {
      const [x, y] = vertices[i];
      if (!isPointInPolygon(x, y, shape1.coor)) {
        return false; // 有一个坐标点不在多边形范围内，返回false
      }
    }

    return true; // 所有坐标点都在多边形内部，返回true
  } else if (shape1.type === 2 && shape2.type === 2) {
    // 多边形和多边形的判断逻辑
    const vertices1 = shape1.coor;
    const vertices2 = shape2.coor;

    for (let i = 0; i < vertices2.length; i++) {
      const [x, y] = vertices2[i];
      if (!isPointInPolygon(x, y, vertices1)) {
        return false; // 多边形2的顶点不都在多边形1内部，不嵌套
      }
    }

    return true; // 有坐标点都在多边形内部，返回true
  }
}

function isPointInPolygon(x: number, y: number, vertices: any) {
  let inside = false;
  const n = vertices.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = vertices[i][0];
    const yi = vertices[i][1];
    const xj = vertices[j][0];
    const yj = vertices[j][1];

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}



/**
 * 深拷贝函数
 */
export function deepClone<T>(obj: T, hash = new WeakMap()): T {
  // 处理原始类型和 null、undefined
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // 处理循环引用
  if (hash.has(obj)) {
    return hash.get(obj);
  }

  // 处理 ImageData 对象
  if (obj instanceof ImageData) {
    // 创建一个新的 ImageData 对象，并拷贝其 data 属性
    const newImageData = new ImageData(new Uint8ClampedArray(obj.data), obj.width, obj.height);
    hash.set(obj, newImageData);
    return newImageData as any;
  }

  // 处理 Date 对象
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }

  // 处理 RegExp 对象
  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as any;
  }

  // 处理 Map 对象
  if (obj instanceof Map) {
    const result = new Map();
    hash.set(obj, result);
    obj.forEach((value, key) => {
      result.set(deepClone(key, hash), deepClone(value, hash));
    });
    return result as any;
  }

  // 处理 Set 对象
  if (obj instanceof Set) {
    const result = new Set();
    hash.set(obj, result);
    obj.forEach(value => {
      result.add(deepClone(value, hash));
    });
    return result as any;
  }

  // 处理数组
  if (Array.isArray(obj)) {
    const result: any[] = [];
    hash.set(obj, result);
    obj.forEach((item, index) => {
      result[index] = deepClone(item, hash);
    });
    return result as T;
  }

  // 处理对象
  const result = Object.create(Object.getPrototypeOf(obj));
  hash.set(obj, result);

  Reflect.ownKeys(obj).forEach(key => {
    const value = (obj as any)[key];
    result[key as keyof typeof result] = deepClone(value, hash);
  });

  return result as T;
}




/**
 * 判断两个对象的某些keys是否相等
 */
export function deepEqual(obj1: any, obj2: any, keysToCompare?: string[]): boolean {
  // 如果两个对象或数组引用相同，直接返回 true
  if (obj1 === obj2) return true;

  // 如果 obj1 和 obj2 的 type 都为 8(Mask)，比较特定属性值
  if (obj1.type === 8 && obj2.type === 8) {
    const maskKeysToCompare = ['uuid', 'label', 'maskBase64'];
    for (let key of maskKeysToCompare) {
      if (obj1[key] !== obj2[key]) {
        return false;
      }
    }
    return true; // 如果 uuid, label, maskBase64 都相等，返回 true
  }

  // 检查是否为对象或数组
  if (typeof obj1 !== 'object' || obj1 === null ||
    typeof obj2 !== 'object' || obj2 === null) {
    return false;
  }

  // 如果是数组，比较数组长度并递归比较每个元素
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return false;
    for (let i = 0; i < obj1.length; i++) {
      if (!deepEqual(obj1[i], obj2[i], keysToCompare)) {
        return false;
      }
    }
    return true;
  }

  // 如果不是数组，则按对象处理
  const keys1 = keysToCompare || Object.keys(obj1);

  // 比较对象中的键值对
  for (let key of keys1) {
    if ((!(key in obj1) && (key in obj2) || ((key in obj1) && !(key in obj2))) || !deepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }

  return true;
}


