import { Directive, DirectiveBinding } from 'vue';
import { WatermarkOptions } from './types';
import { Watermark } from './watermark';

/**
 * 使用 WeakMap 存储每个 DOM 元素对应的 Watermark 实例
 * 优势：当元素被销毁时，对应的实例可被垃圾回收，避免内存泄漏
 */
const watermarkMap = new WeakMap<HTMLElement, Watermark>();

/**
 * v-watermark 指令定义
 */
export const vWatermark: Directive<HTMLElement, WatermarkOptions> = {
  /**
   * 元素挂载时：
   * 1. 根据传入的配置创建 Watermark 实例
   * 2. 将实例存入 WeakMap，便于后续更新或销毁时获取
   */
  mounted(el: HTMLElement, binding: DirectiveBinding<WatermarkOptions>) {
    const instance = new Watermark(el, binding.value ?? {});
    watermarkMap.set(el, instance);
  },

  /**
   * 指令绑定值更新时：
   * 调用实例的 update 方法，支持动态修改水印配置（如文本、透明度、监控开关等）
   */
  updated(el: HTMLElement, binding: DirectiveBinding<WatermarkOptions>) {
    const instance = watermarkMap.get(el);
    if (instance) {
      instance.update(binding.value ?? {});
    }
  },

  /**
   * 元素卸载时：
   * 调用实例的 destroy 方法清理所有监听和 DOM，并从 WeakMap 中移除
   */
  unmounted(el: HTMLElement) {
    const instance = watermarkMap.get(el);
    if (instance) {
      instance.destroy();
      watermarkMap.delete(el);
    }
  },
};