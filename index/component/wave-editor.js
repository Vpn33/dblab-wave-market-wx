// index/component/wave-editor.js
//将字符串转换成二进制形式，中间用空格隔开
import cons from '../../lib/consts';
import Toast from '@vant/weapp/toast/toast';
import wa from "../../lib/wave-analyzer";
import tools from '../../lib/tools';
import moment from "moment";
import '../../lib/lodash-init';
import _ from "lodash";

// 小节模板
let stageTmp = {
    pw: 0, // 电源增量
    hzType: 0, //频率类型 0-固定 1-节内渐变 2-元间渐变 3-元内渐变
    hz: 1, // 频率
    hzGradient: 0, // 渐变类型,
    times: 1, // 小节时长
    metas: [{
        z: 31 // 振幅 0 - 31
    }], // 默认只有一个元
}

function getHalfWaveChartsOpt() {
    let tmp = cons.getWaveChartsOpt();
    tmp.legend.data[0].textStyle.fontSize = 9;
    tmp.legend.data[1].textStyle.fontSize = 9;
    return tmp;
}

function strToBinary(str) {
    var result = [];
    var list = str.split("");
    for (var i = 0; i < list.length; i++) {
        if (i != 0) {
            result.push(" ");
        }
        var item = list[i];
        var binaryStr = item.charCodeAt().toString(2);
        result.push(binaryStr);
    }
    return result.join("");
}

//将二进制字符串转换成Unicode字符串
function binaryToStr(str) {
    var result = [];
    var list = str.split(" ");
    for (var i = 0; i < list.length; i++) {
        var item = list[i];
        var asciiCode = parseInt(item, 2);
        var charValue = String.fromCharCode(asciiCode);
        result.push(charValue);
    }
    return result.join("");
}
Component({
    /**
     * 组件的属性列表
     */
    properties: {
        waveId: {
            type: String,
            value: '',
        },
        channel: {
            type: String,
            value: '',
        },
        channelPw: {
            type: Object,
            value: {
                a: 0,
                b: 0
            },
        }
    },

    /**
     * 组件的初始数据
     */
    data: {
        isPlaying: false, // 正在播放
        isShowChart: false, // 正在显示图像
        // 波形总次数 = 小节时长/形状时长
        // 元 = 完整波形(N个振幅) 一个元内有多个振幅 一小节内有多个元
        // 颗粒摩擦 节内渐变 小节时长内每个振幅均匀根据频率渐变 
        // 波浪涟漪 元间渐变 小节内的全部振幅作为整体(一次完整波形)根据时长渐变 
        // 挑逗1 元内渐变 一次完整的波形内频率渐变不管小节时长多少
        hzTypeArr: ["固定", "节内渐变", "元间渐变", "元内渐变"],
        hzGradientArr: ["高 -> 低", "低 -> 高"],
        aChannelEnable: true, // A通道启用
        bChannelEnable: true, // B通道启用
        waveAChartsOpt: getHalfWaveChartsOpt(), // A通道波形图参数
        waveBChartsOpt: getHalfWaveChartsOpt(), // B通道波形图参数
        wave: {},
        // wave:{
        //     name: "潮汐",
        //     author: "XuDL",
        //     channelType: '0', // 通道类型 0-单通道 1-双通道
        //     stages: [{ // 小节数据
        //         pw: 0, // 电源增量
        //         hzType: 1, //0-固定 1-节内渐变 2-元间渐变 3-元内渐变
        //         hz: [10, 300],
        //         hzGradient: 0, // 渐变类型 0:高 -> 低 1:低 -> 高
        //         times: 1,
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
        // },
        // wave: {
        //     id:"12321asdasdsa",
        //     name: "持续",
        //     author: "XuDL",
        //     channelType: '1', // 通道类型 0-单通道 1-双通道
        //     a: {
        //         enabled: true,
        //         stages: [{ // 小节数据
        //             pw: 0, // 电源增量
        //             hzType: 0, //0-固定 1-节内渐变 2-元间渐变 3-元内渐变
        //             hz: 100, // 频率
        //             times: 10, // 小节时长
        //             metas: [{ // 元振幅
        //                 z: 31
        //             }],
        //             restTimes: 5 // 休息时长 单位0.1
        //         }]
        //     }
        // }
        showXyzImport: false, // 是否显示对话框
        xyzImpData: "", // xyz格式的import数据
    },
    lifetimes: {
        attached: function () {
            //console.log(111111)
            let data = wa.analyzeWave(this.data.wave);
            //console.log(data);
        },
        ready: function () {
            // 在组件实例进入页面节点树时执行
            let waveId = this.data.waveId;
            if (!waveId) {
                return;
            }
            let channel = this.data.channel;
            if (channel) {
                this.setData({
                    channel
                });
            }
            // 加载波形
            this.readExistsWave(waveId);
        }
    },
    observers: {
        // 'wave': function (wave) {
        //     let ena = '0';
        //     if (wave) {
        //         if (wave.a || wave.b) {
        //             ena = '1';
        //         }
        //     }
        //     this.setData({
        //         'channelType': ena
        //     })
        // },
    },
    /**
     * 组件的方法列表
     */
    methods: {
        async readExistsWave(waveId) {
            let wave = await wa.readWave(waveId);
            this.setData({
                wave
            });
        },
        // createWave() {
        //     let that = this;
        //     const fs = wx.getFileSystemManager();
        //     let content = strToBinary(JSON.stringify(this.data.wave));
        //     fs.writeFile({
        //         filePath: `${wx.env.USER_DATA_PATH}/myWaves/` + this.data.wave.id + '.dlw',
        //         data: content,
        //         encoding: 'binary',
        //         success(res) {
        //             console.log(res)
        //         },
        //         fail(res) {
        //             console.error(res)
        //         }
        //     })
        // },
        // readWave() {
        //     let that = this;
        //     wx.getFileSystemManager().readFile({
        //         filePath: `${wx.env.USER_DATA_PATH}/myWaves/` + this.data.waveId + '.dlw',
        //         success(res) {
        //             let unit8Arr = new Uint8Array(res.data);
        //             let encodedString = String.fromCharCode.apply(null, unit8Arr);
        //             let s = binaryToStr(encodedString);
        //             console.log(s)
        //             let wave = JSON.parse(s);
        //             that.setData({
        //                 wave
        //             });
        //         },
        //         fail(res) {
        //             console.error(res)
        //         }
        //     });
        // },
        onChange(e) {
            this.setData({
                'wave.name': e.detail
            });
        },
        onChannelTypeChange(e) {
            this.setData({
                'wave.channelType': e.detail
            });
        },
        onChartsInstance(e) {
            let name = e.target.dataset['compName'];
            this[name] = e.detail;
            console.log("waveAChartsOpt = ", this.waveAChartsOpt)
        },
        toggleCharts(e) {
            let showCharts = this.data.isShowChart;
            this.setData({
                isShowChart: !showCharts
            });
        },
        togglePlaying(e) {
            let isPlaying = this.data.isPlaying;
            this.setData({
                isPlaying: !isPlaying
            });
        },
        onChangeStageVal(e) {
            let cvl = e.detail;
            let data = {};
            let ct = this.data.wave.channelType || '0';
            if ( ct === '0') {
                data['wave.stages'] = cvl.channelWave.stages;
            } else {
                data['wave.' + cvl.channelName + '.stages'] = cvl.channelWave.stages;
            }
            this.setData(data);
        },
        async saveWave(e) {
            let wave = Object.assign({}, this.data.wave);
            if (!wave.name) {
                Toast.fail("波形名称不能为空");
                return;
            }
            // 如果没有通道类型要设置一下
            if (!wave.channelType) {
                if (wave.a && wave.b) {
                    // 双通道
                    wave.channelType = '1';
                } else if (wave.stages && wave.stages.length > 0) {
                    // 单通道
                    wave.channelType = '0';
                }
            }
            if (wave.channelType === '0') {
                if (tools.isEmpty(wave.stages)) {
                    Toast.fail("至少添加一个小节");
                    return;
                }
            }
            // id
            if (!wave.id) {
                wave.id = tools.uuid();
            }

            // 是否需要A通道
            if (wave.a && (wave.a.enabled === false || tools.isEmpty(wave.a.stages))) {
                delete wave.a;
            }
            // 是否需要B通道
            if (wave.b && (wave.b.enabled === false || tools.isEmpty(wave.b.stages))) {
                delete wave.b;
            }
             
            if (wave.channelType === '1') {
                if (wave.a && wave.b) {
                    let st = [];
                    st = st.concat(wave.a.stages || [], wave.b.stages || []);
                    if (tools.isEmpty(st)) {
                        Toast.fail("任意通道至少添加一个小节");
                        return;
                    }
                } else if (wave.a) {
                    if (tools.isEmpty(wave.a.stages)) {
                        Toast.fail("A通道至少添加一个小节");
                        return;
                    }
                } else if (wave.b) {
                    if (tools.isEmpty(wave.b.stages)) {
                        Toast.fail("B通道至少添加一个小节");
                        return;
                    }
                } else {
                    Toast.fail("任意通道至少添加一个小节");
                    return;
                }
            }

            // 创建时间
            if (!wave.createTime) {
                wave.createTim = moment().format("YYYY-MM-DD HH:mm:ss")
            }
            // 写入文件
            let res = await wa.writeWave(wave);
            if (res) {
                Toast.success({
                    message: '保存成功'
                });
                setTimeout(() => {
                    wx.switchTab({
                        url: '/index/my-wave-list'
                    });
                }, 500);
            }


            // console.log("wave = ", JSON.stringify(this.data.wave, null, 4));
        },        
    }
})