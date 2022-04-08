// index/component/channel-wave-edt.js
import tools from '../../lib/tools';
import cons from '../../lib/consts';
import Dialog from '@vant/weapp/dialog/dialog';
Component({
    /**
     * 组件的属性列表
     */
    properties: {
        noChannel:{
            type: Boolean,
            value: false,
        },
        channelName: {
            type: String,
            value: 'A',
        },
        channelWave: { // 某一个通道的波形数据
            type: Object,
            value: {
                enabled: true,
                stages: []
            }
            // value: {
            //     name: "潮汐",
            //     stages: [{
            //         pw: 0, // 电源增量
            //         hzType: 1, //0-固定 1-节内渐变 2-元间渐变 3-元内渐变
            //         hz: [1, 100],
            //         hzGradient: 0, // 渐变类型 0:高 -> 低 1:低 -> 高
            //         times: 3,
            //         metas: [{
            //             z: 0
            //         }, {
            //             z: 5
            //         }, {
            //             z: 10
            //         }, {
            //             z: 15
            //         }, {
            //             z: 20
            //         }, {
            //             z: 25
            //         }, {
            //             z: 30
            //         }, {
            //             z: 29
            //         }, {
            //             z: 28
            //         }, {
            //             z: 27
            //         }, {
            //             z: 26
            //         }]
            //     }]
            // }
        }
    },

    /**
     * 组件的初始数据
     */
    data: {
        // 波形总次数 = 小节时长/形状时长
        // 元 = 完整波形(N个振幅) 一个元内有多个振幅 一小节内有多个元
        // 颗粒摩擦 节内渐变 小节时长内每个振幅均匀根据频率渐变 
        // 挑逗1 元内渐变 一次完整的波形内频率渐变不管小节时长多少
        // 波浪涟漪 元间渐变 小节内的全部振幅作为整体(一次完整波形)根据时长渐变 
        hzTypeArr: ["固定", "节内渐变", "元内渐变", "元间渐变"],
        hzGradientArr: ["快 -> 慢", "慢 -> 快"],
        channelEnable: true, // 通道启用
    },
    observers: {
        'channelWave': function (channelWave) {
            let ena = true;
            if (tools.isEmpty(channelWave)) {
                return ena;
            }
            if (!tools.isEmpty(channelWave.enabled)) {
                ena = channelWave.enabled;
            }
            let res = ena && (channelWave.stages && channelWave.stages.length > 0);
            this.setData({
                channelEnable: res
            })
        },
    },
    /**
     * 组件的方法列表
     */
    methods: {
        showPwHelp() {
            Dialog.alert({
                context: this,
                message: '当小节开始，会以当前电源强度为基准按照设置的增量(或减量)进行电源强度的自动改变。(若开启了自动电源强度，则该设置无效)',
            });
        },
        showHzHelp() {
            Dialog.alert({
                context: this,
                message: '脉冲频率值越低，实际感受到的越快。\n频率值越高，感受到的越慢。\n 频率类型说明↓ \n固定:小节内频率相同 \n节内渐变:小节时长内每个振幅均匀根据频率渐变 \n元内渐变:一次完整的波形内频率渐变不管小节时长多少 \n元间渐变:小节内的全部振幅作为整体(一次完整波形)根据时长渐变',
            });
        },
        channgeChannelWave() {
            let channelWave = this.properties.channelWave;
            let data = {
                channelName: this.properties.channelName,
                channelWave: channelWave
            };
            this.triggerEvent("change", data);
        },
        createStage() {
            // 新增小节
            let nStage = cons.getStageTmp();
            let stage = [];
            if (this.properties.channelWave && this.properties.channelWave.stages) {
                stage = this.properties.channelWave.stages;
            }
            stage.push(nStage);
            this.setData({
                "channelWave.stages": stage
            });
            this.channgeChannelWave();
            // console.log(this.data.wave.stages[idx].pw);
        },
        onDelStage(e) {
            // 删除小节
            let idx = e.target.dataset['stageIdx'];
            let stages = this.properties.channelWave.stages;
            let data = {};
            if (stages.length == 1) {
                return;
            }
            stages.splice(idx, 1);
            data["channelWave.stages"] = stages;
            this.setData(
                data
            );
            this.channgeChannelWave();
        },
        onChannelEnableChange(e) {
            let data = {};
            data['channelWave.enabled'] = e.detail;
            this.setData(
                data
            );
            this.channgeChannelWave();
        },
        onPwChange(e) {
            let idx = e.target.dataset['stageIdx'];
            let data = {};
            data['channelWave.stages[' + idx + '].pw'] = e.detail;
            this.setData(
                data
            );
            this.channgeChannelWave();
        },
        hzTypeChange(e) {
            // 频率类型
            // console.log(e);
            let idx = e.target.dataset['stageIdx'];
            let hzType = this.properties.channelWave.stages[idx].hzType;
            let hz = this.properties.channelWave.stages[idx].hz;
            let data = {};
            if (hzType == 0) {
                // 如果从固定频率变成分段频率 要把hz修正成数组
                data['channelWave.stages[' + idx + '].hz'] = [1, hz];
            }
            hzType++;
            if (hzType > 3) {
                hzType = 0;
                // 如果从其他分段频率变成固定 要把hz修正成整数
                data['channelWave.stages[' + idx + '].hz'] = hz[1];
            }

            data['channelWave.stages[' + idx + '].hzType'] = hzType;

            this.setData(
                data
            );
            this.channgeChannelWave();
        },
        onHzDrag(e) {
            // 频率改变
            // console.log(JSON.stringify(e.detail));

            let idx = e.target.dataset['stageIdx'];
            let hz = this.properties.channelWave.stages[idx].hz;
            let data = {};
            hz = e.detail.value;
            data['channelWave.stages[' + idx + '].hz'] = hz;
            this.setData(
                data
            );
            this.channgeChannelWave();
        },
        addAp(e) {
            let idx = e.target.dataset['stageIdx'];
            let hz = this.properties.channelWave.stages[idx].hz;
            let ap = hz + 1;
            if (ap > 100) ap = 100;
            let data = {};
            data['channelWave.stages[' + idx + '].hz'] = ap;
            this.setData(
                data
            );
            this.channgeChannelWave();
        },
        addLongAp() {
            this.addLongApInv = setInterval(() => {
                this.addAp();
            }, 100);
        },
        endLongAp() {
            clearInterval(this.addLongApInv);
            this.addLongApInv = null;
        },
        subAp(e) {
            let idx = e.target.dataset['stageIdx'];
            let hz = this.properties.channelWave.stages[idx].hz;
            let ap = hz - 1;
            if (ap < 10) ap = 10;
            let data = {};
            data['channelWave.stages[' + idx + '].hz'] = ap;
            this.setData(
                data
            );
            this.channgeChannelWave();
        },
        subLongAp() {
            this.subLongApInv = setInterval(() => {
                this.subAp();
            }, 100);
        },
        endSubLongAp() {
            clearInterval(this.subLongApInv);
            this.subLongApInv = null;
        },
        hzGradientChange(e) {
            // 渐变类型
            let idx = e.target.dataset['stageIdx'];
            let hzGradient = this.properties.channelWave.stages[idx].hzGradient;
            let data = {};
            if (hzGradient == 0) {
                hzGradient = 1;
            } else {
                hzGradient = 0;
            }
            data['channelWave.stages[' + idx + '].hzGradient'] = hzGradient;
            this.setData(
                data
            );
            this.channgeChannelWave();
        },
        addMeta(e) {
            let idx = e.target.dataset['stageIdx'];
            let stages = this.properties.channelWave.stages[idx];
            stages.metas.push({
                z: 31
            });
            let data = {};
            data['channelWave.stages[' + idx + ']'] = stages;
            this.setData(
                data
            );
            this.channgeChannelWave();
        },
        subMeta(e) {
            let idx = e.target.dataset['stageIdx'];
            let stages = this.properties.channelWave.stages[idx];
            let data = {};
            if (stages.metas.length == 1) {
                return;
            }
            stages.metas.pop();
            data['channelWave.stages[' + idx + ']'] = stages;
            this.setData(
                data
            );
            this.channgeChannelWave();
        },
        subOneMeta(e) {
            let idx = e.target.dataset['stageIdx'];
            let mIdx = e.target.dataset['metaIdx'];
            let stages = this.properties.channelWave.stages[idx];
            let data = {};
            stages.metas.splice(mIdx, 1);
            data['channelWave.stages[' + idx + ']'] = stages;
            this.setData(
                data
            );
            this.channgeChannelWave();
        },
        onMetaZChange(e) {
            // 元中的一个振幅改变值
            let idx = e.target.dataset['stageIdx'];
            let mIdx = e.target.dataset['metaIdx'];
            let data = {};
            let val = Math.abs(e.detail - 31);

            data['channelWave.stages[' + idx + '].metas[' + mIdx + '].z'] = val;
            this.setData(
                data
            );
            this.channgeChannelWave();
            // console.log(this.data.wave.stages[idx].metas[mIdx]);
        },
        onStageTimeChange(e) {
            // 小节时长改变
            let idx = e.target.dataset['stageIdx'];
            let data = {};

            data['channelWave.stages[' + idx + '].times'] = e.detail;
            this.setData(
                data
            );
            this.channgeChannelWave();
            // console.log(this.data.wave.stages[idx].times);
        },
        onRestTimeChange(e) {
            // 休息时长改变
            let idx = e.target.dataset['stageIdx'];
            let data = {};

            data['channelWave.stages[' + idx + '].restTimes'] = e.detail;
            this.setData(
                data
            );
            this.channgeChannelWave();
            // console.log(this.stages[idx].restTimes);
        }
    }
})