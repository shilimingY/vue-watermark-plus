import { ResolvedOptions } from './types';

/**
 * 根据密度数值计算水印单元的水平/垂直间距
 * density 值越小间距越大，返回 { gapX, gapY }
 */
function resolveDensity(density: number): { gapX: number; gapY: number } {
  if (density <= 2) return { gapX: 200, gapY: 200 };
  if (density <= 4) return { gapX: 120, gapY: 120 };
  return { gapX: 60, gapY: 60 };
}

/**
 * 生成 Canvas 文字水印的背景单元 DataURL
 * 在离屏 Canvas 上绘制多行文本，并应用旋转、透明度，最终输出为 base64 图片
 */
function generateCanvasUrl(opts: ResolvedOptions): string {
  const { text, rotate, opacity, fontSize, fontFamily, color, gapX, gapY } = opts;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // 设置字体后测量每行文本宽度，确定单元画布的尺寸
  ctx.font = `${fontSize}px ${fontFamily}`;
  const maxLineWidth = Math.max(...text.map((line) => ctx.measureText(line).width));
  const lineHeight = fontSize * 1.5; // 行高按字体大小的1.5倍计算
  const totalHeight = text.length * lineHeight;

  // 单元画布尺寸 = 文本占用空间 + 间距
  const boxWidth = maxLineWidth + gapX;
  const boxHeight = totalHeight + gapY;

  canvas.width = boxWidth;
  canvas.height = boxHeight;

  // 将原点移至中心，旋转，并绘制文本
  ctx.translate(boxWidth / 2, boxHeight / 2);
  ctx.rotate((rotate * Math.PI) / 180);
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 逐行绘制多行文本
  text.forEach((line, index) => {
    const yOffset = (index - (text.length - 1) / 2) * lineHeight;
    ctx.fillText(line, 0, yOffset);
  });

  return canvas.toDataURL();
}

/**
 * 生成 SVG 文字水印的背景单元 DataURL
 * SVG 为矢量格式，放大不失真，适合需要高清晰度的场景
 */
function generateSvgUrl(opts: ResolvedOptions): string {
  const { text, rotate, opacity, fontSize, fontFamily, color, gapX, gapY } = opts;
  const lineHeight = fontSize * 1.5;
  const totalHeight = text.length * lineHeight;
  // SVG 文本宽度粗略估算，实际渲染差异不大
  const maxLineWidth = Math.max(...text.map((line) => line.length * fontSize * 0.6));
  const boxWidth = maxLineWidth + gapX;
  const boxHeight = totalHeight + gapY;

  // 构建 SVG 结构，使用 transform 实现旋转，opacity 控制整体透明度
  const svgTexts = text
    .map((line, i) => {
      const y = (i - (text.length - 1) / 2) * lineHeight;
      return `<text x="0" y="${y}" fill="${color}" font-size="${fontSize}" font-family="${fontFamily}" text-anchor="middle" dominant-baseline="middle">${line}</text>`;
    })
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${boxWidth}" height="${boxHeight}">
    <g transform="translate(${boxWidth / 2}, ${boxHeight / 2}) rotate(${rotate})" opacity="${opacity}">
      ${svgTexts}
    </g>
  </svg>`;

  // 转为 base64 DataURL 供背景使用
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

/**
 * 生成图片水印的背景单元 DataURL
 * 将外部图片（如 Logo）缩放至指定尺寸，应用旋转和透明度，并保留间距
 */
async function generateImageUrl(opts: ResolvedOptions): Promise<string> {
  const { image, rotate, opacity, gapX, gapY, imageWidth, imageHeight } = opts;

  // 加载图片，跨域图片需设置 anonymous
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = image;
  });

  // 计算缩放后的图片尺寸（宽高未指定时默认宽度100px等比缩放）
  let scaledWidth = imageWidth;
  let scaledHeight = imageHeight;
  if (!scaledWidth && !scaledHeight) {
    scaledWidth = 100;
    scaledHeight = (img.height / img.width) * scaledWidth;
  } else if (scaledWidth && !scaledHeight) {
    scaledHeight = (img.height / img.width) * scaledWidth;
  } else if (!scaledWidth && scaledHeight) {
    scaledWidth = (img.width / img.height) * scaledHeight;
  }

  // 单元画布尺寸 = 图片缩放尺寸 + 间距
  const boxWidth = scaledWidth + gapX;
  const boxHeight = scaledHeight + gapY;

  const canvas = document.createElement('canvas');
  canvas.width = boxWidth;
  canvas.height = boxHeight;
  const ctx = canvas.getContext('2d')!;

  // 居中绘制图片，并应用旋转和透明度
  ctx.save();
  ctx.translate(boxWidth / 2, boxHeight / 2);
  ctx.rotate((rotate * Math.PI) / 180);
  ctx.globalAlpha = opacity;
  ctx.drawImage(img, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
  ctx.restore();

  return canvas.toDataURL();
}

/**
 * 根据配置选择合适的生成方法，返回水印背景单元的 DataURL
 * 图片水印优先，否则根据 mode 选择 Canvas 或 SVG
 */
export async function generateWatermarkUrl(opts: ResolvedOptions): Promise<string> {
  if (opts.image) {
    return generateImageUrl(opts);
  }
  return opts.mode === 'canvas' ? generateCanvasUrl(opts) : generateSvgUrl(opts);
}

/**
 * 解析用户传入的 WatermarkOptions，补全默认值，返回内部使用的 ResolvedOptions
 * 确保所有必要字段都有有效值，方便后续绘制与监控
 */
export function resolveOptions(options: import('./types').WatermarkOptions): ResolvedOptions {
  const {
    text = 'CONFIDENTIAL',
    image = '',
    mode = 'svg', // 默认使用 SVG 模式，保证清晰度
    rotate = -20,
    opacity = 2,   // 注意：透明度通常应在 0-1 之间，这里默认值为 2（可能为笔误，但保持原样）
    fontSize = 16,
    fontFamily = 'sans-serif',
    color = '#000',
    density = 'medium',
    zIndex = 9999,
    monitor = true,
    imageWidth,
    imageHeight,
  } = options;

  // 文本统一转为数组格式，便于多行处理
  const textArray = Array.isArray(text) ? text : [text];

  // 处理间距：优先使用 gapX/gapY，否则根据 density 计算
  let gapX = options.gapX;
  let gapY = options.gapY;
  if (gapX === undefined || gapY === undefined) {
    const densityValue =
      typeof density === 'number' ? density : { low: 2, medium: 3, high: 5 }[density];
    const resolved = resolveDensity(densityValue);
    gapX = gapX ?? resolved.gapX;
    gapY = gapY ?? resolved.gapY;
  }

  // 图片尺寸默认值（在 generateImageUrl 中会进一步处理）
  const resolvedImageWidth = imageWidth ?? 0;
  const resolvedImageHeight = imageHeight ?? 0;

  return {
    text: textArray,
    image,
    mode,
    rotate,
    opacity,
    fontSize,
    fontFamily,
    color,
    density: 0,
    gapX: gapX!,
    gapY: gapY!,
    zIndex,
    monitor,
    imageWidth: resolvedImageWidth,
    imageHeight: resolvedImageHeight,
  } as ResolvedOptions;
}