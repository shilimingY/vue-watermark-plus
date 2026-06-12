export type WatermarkMode = 'canvas' | 'svg';
export type DensityPreset = 'low' | 'medium' | 'high';

export interface WatermarkOptions {
  /** 水印文本（可多行） */
  text?: string | string[];
  /** 水印图片 URL（与文本互斥，优先使用图片） */
  image?: string;
  /** 渲染模式，默认 'svg' */
  mode?: WatermarkMode;
  /** 倾斜角度（deg），默认 -20 */
  rotate?: number;
  /** 全局透明度 0-1，默认 0.2 */
  opacity?: number;
  /** 字体大小（px），默认 16 */
  fontSize?: number;
  /** 字体族，默认 'sans-serif' */
  fontFamily?: string;
  /** 文字颜色，默认 '#000' */
  color?: string;
  /** 密度预设或自定义间距（px），默认 'medium' */
  density?: DensityPreset | number;
  /** 水平间距（px），优先级高于 density */
  gapX?: number;
  /** 垂直间距（px），优先级高于 density */
  gapY?: number;
  /** 水印层 z-index，默认 9999 */
  zIndex?: number;
  /** 是否启用 DOM 防篡改监控，默认 true */
  monitor?: boolean;
  /** 图片水印宽度（px），不传则默认 100 */
  imageWidth?: number;
  /** 图片水印高度（px），若不传则按宽度等比计算 */
  imageHeight?: number;
}

/** 内部使用的完整配置（所有可选字段已填充默认值） */
export type ResolvedOptions = Required<Omit<WatermarkOptions, 'image' | 'text' | 'gapX' | 'gapY' | 'imageWidth' | 'imageHeight'>> & {
  text: string[];
  image: string;
  gapX: number;
  gapY: number;
  imageWidth: number;
  imageHeight: number;
};