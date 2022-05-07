// index/component/wave-editor.js
//将字符串转换成二进制形式，中间用空格隔开
import cons from '../../lib/consts';
import Toast from '@vant/weapp/toast/toast';
import wa from "../../lib/wave-analyzer";
import tools from '../../lib/tools';
import moment from "moment";
import '../../lib/lodash-init';
import _ from "lodash";
import * as echarts from '../../lib/echarts.min';

function ecAInstance(canvas, width, height, dpr) {
    // ready函数设置的comp就是组件对象
    if (!this.setCharter) {
        return;
    }
    let charter = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: dpr // 像素
    });
    canvas.setChart(charter);

    var option = getHalfWaveChartsOpt();
    charter.setOption(option);
    this.setCharter(charter);
    return charter;
}

function ecBInstance(canvas, width, height, dpr) {
    // ready函数设置的comp就是组件对象
    if (!this.setCharter) {
        return;
    }
    let charter = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: dpr // 像素
    });
    canvas.setChart(charter);

    var option = getHalfWaveChartsOpt();
    charter.setOption(option);
    this.setCharter(charter);
    return charter;
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
        pw: { // 电源强度
            a: 0,
            b: 0
        },
        wave: {
            channelType: '0' // 通道类型 0-单通道 1-双通道
        },
        showXyzImport: false, // 是否显示对话框
        xyzImpData: "", // xyz格式的import数据
        visibleHeight: '',
        playerHeight: '2rem',
        ecAInstance: {
            onInit: ecAInstance
        },
        ecBInstance: {
            onInit: ecBInstance
        },
    },
    pageLifetimes: {
        show: function () {
            // 页面被展示
            // 获取全局变量蓝牙设备
            if (!this._device) {
                this._device = getApp().blDevice;
            }
            // 如果是编辑器模式 就不用再设置了
            if (!this._device.isEditing()) {
                // 如果不是就设置为编辑器模式 
                this._device.setEditing(true);
            }
            // 设置发送数据的回调函数
            this._device.setSendedFunc('a', this.sendedData, this);
            // 设置 电源改变回调函数
            this._device.setPwChangedFunc('a', this.setPwChangedFunc, this);

            // 设置发送数据的回调函数
            this._device.setSendedFunc('b', this.sendedData, this);
            // 设置 电源改变回调函数
            this._device.setPwChangedFunc('b', this.setPwChangedFunc, this);
            // 校验通道是否正在执行
            let isRunning = this._device.isRunning('a') || this._device.isRunning('b');
            if (isRunning) {
                // 如果正在播放就需要把当前播放状态改成正在播放
                this.setData({
                    isPlaying: true
                });
            }

            // 读取电源强度缓存
            this.getPw();
        },
        hide: function () {
            // 关闭编辑器模式
            this._device.setEditing(false);
            this.clearCharts();
        }
    },
    lifetimes: {
        attached: function () {
            this._pwChartsData = {
                a: [],
                b: []
            };
            this._waveChartsData = {
                a: [],
                b: []
            };
            //console.log(111111)
            //let data = wa.analyzeWave(this.data.wave);
            //console.log(data);
        },
        ready: function () {
            this._charter = {
                a: null,
                b: null
            };
            // echarts使用组件对象
            this.setData({
                'ecAInstance.setCharter': (charter) => {
                    this._charter.a = charter;
                },
                'ecBInstance.setCharter': (charter) => {
                    this._charter.b = charter;
                },
            });
            // 图像起始值
            this._chartsCnt = {
                'a': 0,
                'b': 0
            };
            this._waveChartsData = {
                'a': [],
                'b': []
            };
            this._pwChartsData = {
                'a': [],
                'b': []
            };

            this.getPlayerHeight();
            // 在组件实例进入页面节点树时执行
            let waveId = this.data.waveId;
            if (!waveId) {
                return;
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
        sendedData(song, time, charts, channel) {
            // 必须打开图像才会显示
            if (!this.data.isShowChart) {
                return;
            }
            this.writeCharts(channel, song, time, charts);
        },
        setPwChangedFunc(ap, bp) {

        },
        onPlayerPwChange(e) {
            // 电源强度改变
            let pw = e.detail;
            let channel = e.target.dataset['channelName'];
            this._device.setPw(channel, pw);
        },
        writeCharts(channel, song, time, charts) {
            // 返回的图像必须要有值
            if (!(charts && charts.length > 0)) {
                return;
            }
            let charter = this._charter[channel];
            if (!charter) {
                return;
            }
            let chartsCnt = this._chartsCnt[channel];
            let waveChartsData = this._waveChartsData[channel];
            let pwChartsData = this._pwChartsData[channel];

            chartsCnt += 10;

            // (x + y) / 100 = 波形数据在100毫秒内会创建几次脉冲
            // let pulseCnt = parseInt((song.x || 0) + (song.y) / 100);
            if (!pwChartsData) {
                pwChartsData = [];
            }
            if (!waveChartsData) {
                waveChartsData = [];
            }
            // console.log("charts", JSON.stringify(charts));
            let tmpLst = [];
            for (let i = 0; i < 10; i++) {
                // 波形图像
                tmpLst.push([chartsCnt + i, charts[i]]);
            }
            // 电源图像
            pwChartsData.push([chartsCnt, this._device.getPw(channel)]);
            // console.log("song with charts", JSON.stringify(tmpLst));
            waveChartsData = waveChartsData.concat(tmpLst);
            // 最大显示数据
            waveChartsData = _.takeRight(waveChartsData, 200);
            pwChartsData = _.takeRight(pwChartsData, 20);

            if (!charter) {
                return;
            }
            // 动态设置最小值和最大值
            let min = _.first(waveChartsData)[0];
            let max = min + 200;
            if (waveChartsData.length === 200) {
                max = _.last(waveChartsData)[0];
            }
            charter.setOption({
                xAxis: {
                    min,
                    max
                }
            });
            this.setCharts(channel, waveChartsData, pwChartsData);
            this._chartsCnt[channel] = chartsCnt;
            this._waveChartsData[channel] = waveChartsData;
            this._pwChartsData[channel] = pwChartsData;
        },
        setCharts(channel, waveChartsData, pwChartsData) {
            let chartCmp = this._charter[channel];
            if (chartCmp) {
                chartCmp.setOption({
                    series: [{
                        data: waveChartsData
                    }, {
                        data: pwChartsData
                    }]
                });
            }
        },
        clearCharts() {
            // 清空图像
            this._chartsCnt = {
                'a': 0,
                'b': 0
            };
            this._waveChartsData = {
                'a': [],
                'b': []
            };
            this._pwChartsData = {
                'a': [],
                'b': []
            };
            this.setCharts('a', [], []);
            this.setCharts('b', [], []);
            if (this._charter.a) {
                var option = cons.getWaveChartsOpt();
                this._charter.a.clear();
                this._charter.a.setOption(option, false);
            }
            if (this._charter.b) {
                var option = cons.getWaveChartsOpt();
                this._charter.b.clear();
                this._charter.b.setOption(option, false);
            }
        },
        getPw() {
            // 读取电量
            let ap = this._device.getPw('a');
            let bp = this._device.getPw('b');
            this.setData({
                pw: {
                    a: ap,
                    b: bp
                }
            });
        },
        async readExistsWave(waveId) {
            let wave = await wa.readWave(waveId);
            // 如果正在播放就不用设置到播放列表了
            if (!this._device.isRunning('a') && !this._device.isRunning('b')) {
                //都没有播放的话 就设置到播放列表
                let pLst = [wave];
                // 设置播放列表
                this._device.setPlayList('a', pLst);
            }
            this.setData({
                wave
            });
        },
        onChange(e) {
            this.setData({
                'wave.name': e.detail
            });
        },
        onChannelTypeChange(e) {
            this.setData({
                'wave.channelType': e.detail
            });
            this.syncWaveToDevice();
        },
        onChartsInstance(e) {
            console.log(getApp());
            let name = e.target.dataset['compName'];
            this[name] = e.detail;

            console.log("chartInstance = ", name, this[name].getOption());
        },
        toggleCharts(e) {
            let showCharts = this.data.isShowChart;
            this.setData({
                isShowChart: !showCharts
            });
            this.getPlayerHeight();
            if (!this.data.isShowChart) {
                this.clearCharts();
            }
        },
        getPlayerHeight() {
            // 当前显示的高度
            this.setData({
                visibleHeight: wx.getSystemInfoSync().windowHeight + 'px'
            });

            const query = wx.createSelectorQuery();
            query.select(".wave-player").boundingClientRect((rect) => {
                // 播放器节点的高度
                this.setData({
                    playerHeight: rect.height + 'px'
                });
            }).exec();
        },
        togglePlaying(e) {
            let isPlaying = this.data.isPlaying;
            let editChannel = this._device.getEditChannel() || 'a';
            let msg1 = this._device.togglePlay(editChannel);
            if (msg1) {
                Toast.fail(msg1);
            }

            this.setData({
                isPlaying: !isPlaying
            });
        },
        onChangeStageVal(e) {
            let cvl = e.detail;
            let data = {};
            let ct = this.data.wave.channelType || '0';
            if (ct === '0') {
                data['wave.stages'] = cvl.channelWave.stages;
            } else {
                data['wave.' + cvl.channelName + '.stages'] = cvl.channelWave.stages;
            }
            this.setData(data);
            this.syncWaveToDevice();
        },
        syncWaveToDevice() {
            // 同步波形数据到设备
            let wave = Object.assign({}, this.data.wave);
            if (!this.checkWave(wave)) {
                return;
            }
            // 获取编辑器进入的通道 如果没有就默认A通道
            let editChannel = this._device.getEditChannel() || 'a';
            // 编辑器模式直接清空列表 添加当前波形 默认A通道
            let pLst = [wave];
            // 设置播放列表
            this._device.setPlayList(editChannel, pLst);
            // 如果当前通道正在播放
            if (this._device.isRunning(editChannel)) {
                // 切换播放
                this._device.changePlay(editChannel, 0);
            }
        },
        checkWave(wave) {
            if (!wave.name) {
                Toast.fail("波形名称不能为空");
                return false;
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
                    return false;
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
                        return false;
                    }
                } else if (wave.a) {
                    if (tools.isEmpty(wave.a.stages)) {
                        Toast.fail("A通道至少添加一个小节");
                        return false;
                    }
                } else if (wave.b) {
                    if (tools.isEmpty(wave.b.stages)) {
                        Toast.fail("B通道至少添加一个小节");
                        return false;
                    }
                } else {
                    Toast.fail("任意通道至少添加一个小节");
                    return false;
                }
            }

            return true;
        },
        async saveWave(e) {
            let wave = Object.assign({}, this.data.wave);
            if (!this.checkWave(wave)) {
                return;
            }
            // 创建时间
            if (!wave.createTime) {
                wave.createTime = moment().format("YYYY-MM-DD HH:mm:ss")
            }
            // 写入文件
            let res = await wa.writeWave(wave);
            if (res) {
                Toast.success({
                    message: '保存成功'
                });
                setTimeout(() => {
                    // wx.switchTab({
                    //     url: '/index/my-wave-list'
                    // });
                    wx.navigateBack();
                }, 500);
            }


            // console.log("wave = ", JSON.stringify(this.data.wave, null, 4));
        },
    }
})