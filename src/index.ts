import { App } from 'vue';
import { vWatermark } from './directive';

export { vWatermark } from './directive';
export type { WatermarkOptions, WatermarkMode } from './types';

const plugin = {
  install(app: App) {
    app.directive('watermark', vWatermark);
  },
};

export default plugin;