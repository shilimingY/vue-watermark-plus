import { App } from 'vue';
import { vWatermark } from './directive';

export { vWatermark } from './directive'; // 供局部注册
export type { WatermarkOptions, WatermarkMode } from './types';

const plugin = {
  install(app: App) {
    app.directive('watermark', vWatermark);
  },
};

export default plugin;