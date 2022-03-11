// index/wave-player.js
import Dialog from '@vant/weapp/dialog/dialog';
import wa from "../../lib/wave-analyzer";
import Toast from '@vant/weapp/toast/toast';
import InvWorker from '../../lib/inv-worker';
import cons from '../../lib/consts';
import '../../lib/lodash-init';
import _ from "lodash";

function getHalfWaveChartsOpt() {
    let tmp = cons.getWaveChartsOpt();
    tmp.legend.data[0].textStyle.fontSize = 9;
    tmp.legend.data[1].textStyle.fontSize = 9;
    return tmp;
}
Component({
    /**
     * 组件的属性列表
     */
    properties: {
        channel: {
            type: String,
            value: 'a',
        },
        pw: {
            type: Number,
            value: 0,
        },
        aiPw: {
            type: Boolean,
            value: true,
        },
        showCharts: {
            type: Boolean,
            value: false,
        },
        playType: {
            type: String,
            value: '0', // 0: 列表循环 1:列表顺序 2:列表随机 3:单曲循环
        },
        playHz: {
            type: Number,
            value: 30,
        },
    },

    /**
     * 组件的初始数据
     */
    data: {
        waveChartsOpt: getHalfWaveChartsOpt(), // 波形图参数
        showPlayType: false, // 0: 列表循环 1:列表顺序 2:列表随机 3:单曲循环
        playList: { // 播放列表都AB的包含 因为是一起存储的 通过channel区分 当前使用的那个
            a: [
                //     {
                //     id: "1111",
                //     name: "潮汐",
                //     author: "XuDL",
                //     pubTime: "2021-01-11 12:23:11",
                //     downTime: "2021-01-11 12:23:11",
                //     a: {
                //         stages: [{
                //             pw: 0, // 电源增量
                //             hzType: 1, //0-固定 1-节内渐变 2-元间渐变 3-元内渐变
                //             hz: [100, 500],
                //             hzGradient: 0, // 渐变类型 0:高 -> 低 1:低 -> 高
                //             times: 3,
                //             metas: [{
                //                 z: 0
                //             }, {
                //                 z: 5
                //             }, {
                //                 z: 10
                //             }, {
                //                 z: 15
                //             }, {
                //                 z: 20
                //             }, {
                //                 z: 25
                //             }, {
                //                 z: 30
                //             }, {
                //                 z: 29
                //             }, {
                //                 z: 28
                //             }, {
                //                 z: 27
                //             }, {
                //                 z: 26
                //             }]
                //         }]
                //     }
                // }
            ],
            b: []
        },
        playTypeStr: "",
        playTypeList: [{
            text: '列表循环',
            value: '0'
        }, {
            text: '列表顺序',
            value: '1'
        }, {
            text: '列表随机',
            value: '2'
        }, {
            text: '单曲循环',
            value: '3'
        }],
        invEnabled: false,
        playInvTime: 5,
        rdmInvEnabled: false,
        playRdmInv: {
            wStart: 300,
            wEnd: 600,
            pStart: 3,
            pEnd: 8
        },
        playingIdx: 0, // 正在播放的波形索引
        invWorker: new InvWorker(), // 发送数据计时器
        dbChannel: true, // 双通道波形优先
        playingTempInfo: { // 正在播放波形的临时变量
            a: { // a通道
                dataIdx: null, // 下标
                wavePrevTime: null, // 上次时间
                waveY: null, // y
            },
            b: {
                dataIdx: null,
                wavePrevTime: null,
                waveY: null,
            },
        } //
    },
    pageLifetimes: {
        show: function () {
            let playType = this.data.playTypeList[this.data.playType];
            if (!playType) {
                playType = this.data.playTypeList[0];
            }
            this.setData({
                playTypeStr: playType.text
            });

            this.init();
        },
    },
    /**
     * 组件的方法列表
     */
    methods: {
        init: function () {
            // 读取播放列表
            (async () => {
                const playList = await wa.readPlayList(this.data.channel);
                //                console.log("playList=", playList);
                if (playList) {
                    this.setData({
                        'playList': playList
                    })
                }
            })();
        },
        showPwHelp() {
            Dialog.alert({
                context: this,
                message: '更精细的电源强度。不同于DG-LAB的APP中的电源强度，APP中的强度被封印成了7的倍数, 由于解开了封印，所以十分灵敏，如使用滑块操作请小心调节。',
            });
        },
        showAiPwHelp() {
            Dialog.alert({
                context: this,
                message: '开启后会自动记录在播放某个波形时的电源强度，下次播放时，如果电源强度大于记录的强度，就会自动减小到已记录的强度，当波形结束播放后，电源强度恢复。' +
                    '更智能的避免波形切换时带来的冲击感。(例如：A波-可承受电源130强度 B波-可承受电源100强度 如果按照APP的功能，从 A -> B 时因为强度没变，就会产生强烈的刺痛感，需要手动调节强度,' +
                    '开启本功能后，就会主键避免这种问题，越使用就越精确)',
            });
        },
        showInvHelp() {
            Dialog.alert({
                context: this,
                message: '固定通道输出的时间，一旦达到设置的时间，通道会自动停止播放，并且设置电源强度为0',
            });
        },
        showRdmInvHelp() {
            Dialog.alert({
                context: this,
                message: '根据随机参数对通道播放时常和间隔进行控制。',
            });
        },
        showDbChannelHelp() {
            Dialog.alert({
                context: this,
                message: '开启后，如果播放的波形是双通道的，另一通道被占用的情况下，将会自动停止另一通道的播放，从而播放当前双通道的波形。如果不开启，只会播放双通道中当前通道的波形',
            });
        },
        showPlayTypePop() {
            this.setData({
                showPlayType: true
            });
        },
        closePlayTypePop() {
            this.setData({
                showPlayType: false
            });
        },
        onInvEnabledChange(e) {
            this.setData({
                invEnabled: e.detail
            });
        },
        onRdmInvEnabledChange(e) {
            this.setData({
                rdmInvEnabled: e.detail
            });
        },
        onPlayTypeChange(e) {
            this.setData({
                playTypeStr: e.detail.value.text,
                showPlayType: false
            });
        },
        toggleWaveCharts() {
            this.data.showCharts = !this.data.showCharts;
            if (!this.data.showCharts) {
                this.clearCharts();
            }
            this.setData({
                showCharts: this.data.showCharts
            });
        },
        clearCharts() {
            this.waveChartsData = [];
            this.pwChartsData = [];
            this.setCharts(this.waveChartsData, this.pwChartsData);
        },
        setCharts(waveChartsData, pwChartsData) {
            if (this.waveChartCmp) {
                this.waveChartCmp.setOption({
                    series: [{
                        data: waveChartsData
                    }, {
                        data: pwChartsData
                    }]
                })
            }
        },
        // writeCharts(y, z, time) {
        //     let dt = time;
        //     if (this.wavePrevTime) {
        //         dt = this.wavePrevTime + this.waveY;
        //     }
        //     if (!this.waveChartsData) {
        //         this.waveChartsData = [];
        //     }
        //     if (!this.pwChartsData) {
        //         this.pwChartsData = [];
        //     }
        //     // 电源强度
        //     this.pwChartsData.push([dt, this.data.pw]);

        //     if (this.pwChartsData.length > 20) {
        //         this.pwChartsData.shift();
        //     }

        //     // 波形数据
        //     this.waveChartsData.push([dt, z]);
        //     if (this.waveChartsData.length > 20) {
        //         this.waveChartsData.shift();
        //     }

        //     // else if(this.waveChartsData.length == 1){
        //     //     this.waveChartsData.unshift([time - 1, 0]);
        //     //     this.waveChartsData.unshift([time - 1023, 0]);
        //     //     let emStart = this.waveChartsData.length;
        //     //     for(emStart;emStart < 20;emStart ++){
        //     //         this.waveChartsData.unshift([time - (100 * emStart), 0]);
        //     //     }
        //     // }
        //     console.log("charts = ", this.waveChartsData[this.waveChartsData.length - 1], "y", y);
        //     this.setCharts(this.waveChartsData, this.pwChartsData);
        //     this.wavePrevTime = time;
        //     this.waveY = y;
        // },
        writeCharts(song, time) {
            // (x + y) / 100 = 波形数据在100毫秒内会创建几次脉冲
            // let pulseCnt = parseInt((song.x || 0) + (song.y) / 100);
            if (!this.waveChartsData) {
                this.waveChartsData = [];
            }
            if (!this.pwChartsData) {
                this.pwChartsData = [];
            }
            // 计算0.1秒 100毫秒内一共有多少次脉冲图像
            let pulseCnt = 0;
            for (let t = 0; t < 100; t++) {
                let dt = time + t;
                if (0 == (t % song.y)) {
                    for (let i = 0; i < song.x; i++) {
                        dt = dt + i;
                        // 电源强度
                        this.pwChartsData.push([dt, this.data.pw]);
                        if (this.pwChartsData.length > 200) {
                            this.pwChartsData.shift();
                        }
                        // 波形数据
                        this.waveChartsData.push([dt, song.z]);
                        if (this.waveChartsData.length > 200) {
                            this.waveChartsData.shift();
                        }
                    }
                    pulseCnt++;
                }
            }
            this.setCharts(this.waveChartsData, this.pwChartsData);
        },
        // writeCharts(hz, z, time) {
        //     let dt = 0;
        //     if (this.waveY != null) {
        //         dt = this.waveY + hz;
        //     }
        //     if (!this.waveChartsData) {
        //         this.waveChartsData = [];
        //     }
        //     if (!this.pwChartsData) {
        //         this.pwChartsData = [];
        //     }
        //     // 电源强度
        //     this.pwChartsData.push([dt, this.data.pw]);

        //     if (this.pwChartsData.length > 30) {
        //         this.pwChartsData.shift();
        //     }

        //     // 波形数据
        //     this.waveChartsData.push([dt, z]);
        //     if (this.waveChartsData.length > 30) {
        //         this.waveChartsData.shift();
        //     }
        //     this.waveY = dt;
        //     console.log("charts  z = ", z, "hz = ", hz, "dt = ", dt);
        //     this.setCharts(this.waveChartsData, this.pwChartsData);
        // },
        subAp() {
            let ap = this.data.pw - 1;
            if (ap < 0) ap = 0;
            this.setData({
                channel: this.data.channel,
                pw: ap
            });
            this.triggerEvent('pwChange', ap);
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
        addAp() {
            let ap = this.data.pw + 1;
            if (ap > 2047) ap = 2047;
            this.setData({
                channel: this.data.channel,
                pw: ap
            });
            this.triggerEvent('pwChange', ap);
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

        apChange(e) {
            let ap = e.detail.value;
            this.setData({
                channel: this.data.channel,
                pw: ap
            });
            this.triggerEvent('pwChange', ap);
        },
        onAiPwChange(e) {
            this.setData({
                aiPw: e.detail
            });
        },
        onPlayListChange(e) {
            // 播放列表修改要存储
            let data = {};
            data['playList'] = e.detail || [];
            this.setData(data);
            // 写入文件
            wa.writePlayList(this.data.channel, this.data.playList);
        },
        onPlayWaveClick(e) {
            // console.log("onPlayWaveClick", e);
            let tar = e.detail;
            let idx = tar.index;
            let data = {};
            data['playingIdx'] = idx;
            this.setData(data);
        },
        onInstance({
            detail: instance
        }) {
            this.waveChartCmp = instance;
        },
        togglePlay(e) {
            let cha = e.target.dataset['channel'];
            let that = this;
            let invWorker = this.data.invWorker;
            if (invWorker.isRunning) {
                invWorker.clean();
                this.setData({
                    invWorker
                });
                return;
            }
            if (!(this.data.playList && this.data.playList.length > 0)) {
                Toast.fail("请添加波形");
                return;
            }
            let idx = this.data.playingIdx;
            let wave = this.data.playList[idx];
            let data = {};
            let waveData = wa.analyzeWave(wave);
            if (!waveData) {
                Toast.fail("波形解析失败，请编辑后重新尝试或更换波形");
                return;
            }
            // 如果是数组 就是单通道的 如果是{} 就是双通道的
            if (_.isArray(waveData)) {
                data[cha] = waveData;
            }
            console.log("wave = ", wave.name, "data = ", data);
            let songChannel = data[cha];
            let dataIdx = 0;
            invWorker.setInvFunc(() => {
                // 波形播放完毕就重置继续播放
                if (dataIdx >= songChannel.length) {
                    dataIdx = 0;
                }
                let song = songChannel[dataIdx];
                if (song) {
                    that.writeCharts(song, new Date().getTime());
                    that.triggerEvent("sendWaveData", {
                        channel: cha,
                        song
                    });
                }
                dataIdx++;
            });
            invWorker.setCleFunc(() => {
                that.wavePrevTime = null;
                that.waveY = null;
            });
            invWorker.run();
            this.setData({
                invWorker
            })
            console.log("invWorker=", invWorker);
        }
    }
})