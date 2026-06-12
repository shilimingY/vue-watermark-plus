import { WatermarkOptions, ResolvedOptions } from './types';
import { generateWatermarkUrl, resolveOptions } from './utils';

/**
 * 水印核心类
 * 负责创建、更新、销毁水印层，并实现防篡改监控和定时样式校验
 */
export class Watermark {
  private el: HTMLElement; // 水印挂载的目标元素
  private options: ResolvedOptions; // 解析后的完整配置
  private container: HTMLDivElement | null = null; // 水印容器 DOM 节点
  private observer: MutationObserver | null = null; // DOM 变动观察器
  private originalPosition: string; // 目标元素初始的 position 值，用于销毁时恢复
  private styleCheckTimer: ReturnType<typeof setInterval> | null = null; // 定时样式校验的定时器

  constructor(el: HTMLElement, options: WatermarkOptions) {
    this.el = el;
    this.options = resolveOptions(options);
    // 记录原始定位方式，避免破坏页面布局
    this.originalPosition = getComputedStyle(el).position;
    this.init();
  }

  /** 初始化流程：创建水印 -> 启动防篡改监控 -> 启动定时样式校验 */
  private async init() {
    await this.createContainer();
    this.startMonitoring();
    this.startPeriodicCheck();
  }

  /**
   * 创建/重建水印容器
   * 水印通过绝对定位覆盖在目标元素上，利用 background-repeat 平铺背景图
   */
  private async createContainer() {
    // 若目标元素为 static，无法作为绝对定位的参照容器，临时改为 relative
    if (this.originalPosition === 'static') {
      this.el.style.position = 'relative';
    }

    // 移除旧的水印容器（如果存在）
    if (this.container) {
      this.container.remove();
      this.container = null;
    }

    // 构建水印容器，使用 !important 防止外部样式覆盖
    const div = document.createElement('div');
    div.className = '__wm_container__';
    div.style.cssText = `
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      pointer-events: none !important;  /* 不拦截鼠标事件 */
      z-index: ${this.options.zIndex} !important;
      background-repeat: repeat !important;
    `;

    // 生成水印单元图（DataURL）并设为背景
    const url = await generateWatermarkUrl(this.options);
    div.style.backgroundImage = `url(${url})`;

    this.el.appendChild(div);
    this.container = div;
  }

  /**
   * 周期性检测水印容器的关键样式（display / visibility / opacity）
   * 用于防范通过 element.style 直接修改样式而绕过 MutationObserver 的情况
   */
  private startPeriodicCheck() {
    // 若 monitor 为 false，则不启动定时校验
    if (!this.options.monitor) {
      this.stopPeriodicCheck();
      return;
    }

    // 避免重复启动
    if (this.styleCheckTimer) return;

    this.styleCheckTimer = setInterval(() => {
      if (!this.container) return;
      const style = getComputedStyle(this.container);
      // 当水印被隐藏或透明度极低时，视为被篡改，立即重建
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        parseFloat(style.opacity) < 0.01
      ) {
        // 重建前先断开观察器，避免重建过程触发自身的 mutation 回调
        this.observer?.disconnect();
        this.createContainer().then(() => {
          this.observeElements();
        });
      }
    }, 2000);
  }

  private stopPeriodicCheck() {
    if (this.styleCheckTimer) {
      clearInterval(this.styleCheckTimer);
      this.styleCheckTimer = null;
    }
  }

  /**
   * 启动 MutationObserver 监控
   * 通过 MutationObserver 监听水印容器的 childList 和 attributes 变化，一旦容器被删除或 style/class 属性被修改，立即重建
   * 当水印容器被从 DOM 中删除，或其 style/class 属性被修改时，自动重建水印
   */
  private startMonitoring() {
    if (this.options.monitor) {
      this.observer = new MutationObserver((mutations) => {
        let needRebuild = false;
        for (const mutation of mutations) {
          // 子节点列表变化：检测水印容器是否被移除
          if (mutation.type === 'childList') {
            const removedNodes = Array.from(mutation.removedNodes);
            if (removedNodes.some((node) => node === this.container)) {
              needRebuild = true;
              break;
            }
            // 目标元素下所有子节点被清空
            if (this.el.children.length === 0) {
              needRebuild = true;
              break;
            }
          }
          // 属性变化：检测水印容器自身的 style 或 class 被修改
          if (mutation.type === 'attributes' && mutation.target === this.container) {
            needRebuild = true;
            break;
          }
        }

        if (needRebuild) {
          this.observer?.disconnect();
          this.createContainer().then(() => {
            this.observeElements();
          });
        }
      });

      this.observeElements();
    }
  }

  /** 绑定 MutationObserver 到目标元素及水印容器上 */
  private observeElements() {
    if (!this.observer) return;
    // 监听父元素的子节点变化
    this.observer.observe(this.el, { childList: true });
    // 监听水印容器自身属性变化
    if (this.container) {
      this.observer.observe(this.container, {
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
    }
  }

  /**
   * 更新水印配置（由指令 updated 钩子调用）
   * 支持动态开关监控（monitor）和更新其他样式配置
   */
  public async update(options: WatermarkOptions) {
    const oldMonitor = this.options.monitor;
    this.options = resolveOptions(options);

    // 更新背景图（即使监控状态不变，配置可能改变）
    if (this.container) {
      const url = await generateWatermarkUrl(this.options);
      this.container.style.backgroundImage = `url(${url})`;
    }

    // 处理监控状态的切换
    if (this.options.monitor !== oldMonitor) {
      if (this.options.monitor) {
        // 重新开启监控：创建新的 MutationObserver 并启动定时校验
        if (!this.observer) {
          this.observer = new MutationObserver((mutations) => {
            let needRebuild = false;
            for (const mutation of mutations) {
              if (mutation.type === 'childList') {
                const removedNodes = Array.from(mutation.removedNodes);
                if (removedNodes.some((node) => node === this.container)) {
                  needRebuild = true;
                  break;
                }
                if (this.el.children.length === 0) {
                  needRebuild = true;
                  break;
                }
              }
              if (mutation.type === 'attributes' && mutation.target === this.container) {
                needRebuild = true;
                break;
              }
            }
            if (needRebuild) {
              this.observer?.disconnect();
              this.createContainer().then(() => {
                this.observeElements();
              });
            }
          });
          this.observeElements();
        }
        this.startPeriodicCheck();
      } else {
        // 关闭监控：断开观察器并停止定时校验
        this.observer?.disconnect();
        this.observer = null;
        this.stopPeriodicCheck();
      }
    }
  }

  /** 销毁水印实例，清理所有监听和 DOM 元素 */
  public destroy() {
    this.observer?.disconnect();
    this.stopPeriodicCheck();
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    // 恢复元素原始的 position 值
    if (this.el.style.position === 'relative') {
      this.el.style.position = this.originalPosition;
    }
  }
}