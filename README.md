# canvas-select-plus

核心架构请查阅canvas-select组件，一个用于图片标注的 javascript 库，基于 canvas，简单轻量，支持矩形、多边形、点、折线、圆形标注、网格标注。

[![NPM version](https://img.shields.io/npm/v/canvas-select.svg?style=flat)](https://npmjs.org/package/canvas-select-plus)



![图例](https://cdn.jsdelivr.net/npm/@heylight/cdn@%5E1/img/demo.png)

## 简介

- 新增功能如下：

- 支持复制矩形、圆形、点。

- 支持隐藏和显示选中的图形。

- 支持一键清空全部图形。

- 支持撤销和重做操作。

- 支持根据鼠标位置切换鼠标样式功能。


## 使用

- 先选中一个图形（暂时仅支持矩形、圆形和点），按ctrl+v ,已鼠标位置为顶点复制图形，保证复制后的图形不会超出背景图片。

- 选中图形，单个删除，无选中时，默认全部删除。

- 选中图形，点击隐藏可以隐藏选中图形，点击显示，逐个显示被隐藏的图形。

- 点击撤销，返回到上一步操作前的状态（目前不支持撤销隐藏、显示、专注模式等模式变换）。

- 点击重做，重做上一次被撤销的操作。

- 鼠标放到图像内样式显示为move，点击矩形，鼠标放到边界点上显示不同的样式，点击其它图像，鼠标放到边界点上显示为pointer。

支持 UMD 模块规范


```bash
npm install canvas-select-plus --save
```

