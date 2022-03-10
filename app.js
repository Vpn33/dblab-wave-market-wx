import * as ec from './lib/echarts.min';
const comp = requirePlugin('echarts');

// 设置自行引入的 echarts 依赖库
comp.echarts = ec;

App({
  onLaunch: function () {

  }
})