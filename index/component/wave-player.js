// index/wave-player.js
import Dialog from '@vant/weapp/dialog/dialog';
import wa from "../../lib/wave-analyzer";
import Toast from '@vant/weapp/toast/toast';
import InvWorker from '../../lib/inv-worker';

function ab2hex(buffer) {
    var hexArr = Array.prototype.map.call(new Uint8Array(buffer), function (bit) {
        return ('00' + bit.toString(16)).slice(-2);
    });
    return hexArr.join('');
}
var pwServiceId = "955A180A-0FE2-F5AA-A094-84B8D4F3E8AD",
    abServiceId = "955A180B-0FE2-F5AA-A094-84B8D4F3E8AD",
    abPWChId = "955A1504-0FE2-F5AA-A094-84B8D4F3E8AD",
    pwChId = "955A1500-0FE2-F5AA-A094-84B8D4F3E8AD",
    aChId = "955A1505-0FE2-F5AA-A094-84B8D4F3E8AD",
    bChId = "955A1506-0FE2-F5AA-A094-84B8D4F3E8AD";

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
        waveChartsOpt: {
            color: ['#e5ff00'],
            grid: {
                width: "90%",
                height: "80%",
                left: "center",
                top: "15%",
                right: "center",
            },
            legend: {
                show: true,
                data: [{
                    name: "波形图像",
                    textStyle: {
                        color: "#fcfcfc"
                    }
                }, {
                    name: "电源强度",
                    textStyle: {
                        color: "#fcfcfc"
                    }
                }]
            },
            xAxis: {
                show: true,
                type: 'time',
                axisLine: { //轴线
                    show: true,
                    lineStyle: {
                        color: '#e5ff00'
                    }
                },
                axisTick: { // 刻度
                    show: false
                },
                axisLabel: { // 刻度标签
                    interval: 0
                },
            },
            yAxis: [{
                show: true,
                max: 31,
                type: 'value',
                axisLine: {
                    show: true,
                    lineStyle: {
                        color: '#e5ff00'
                    }
                },
                axisTick: {
                    show: false
                },
                splitLine: {
                    show: false
                },
                // minInterval: 0,
                // maxInterval: 31,
                axisLabel: {
                    show: false
                },
            }, {
                type: 'value',
                min: 0, //Y轴最小值
                max: 2047, //Y轴最大值
                axisTick: {
                    show: false
                },
                splitLine: {
                    show: false
                },
                axisLabel: {
                    show: false
                },
            }],
            series: [{
                name: '波形图像',
                data: [],
                type: 'bar',
                barWidth: 2
            }, {
                name: '电源强度',
                data: [],
                type: 'line',
                yAxisIndex: 1,
                itemStyle: {
                    normal: {
                        color: '#339bfb' // 折线的颜色
                    }
                },
            }],

            animation: false
        },
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
                message: '更精细的电源强度。不同于DG-LAB的APP中的电源强度，APP中的强度被封印成了7的倍数, 由于解开了封印，所以十分灵敏，如使用滑块操作请小心调节。',
            });
        },
        showAiPwHelp() {
            Dialog.alert({
                message: '开启后会自动记录在播放某个波形时的电源强度，下次播放时，如果电源强度大于记录的强度，就会自动减小到已记录的强度，当波形结束播放后，电源强度恢复。' +
                    '更智能的避免波形切换时带来的冲击感。(例如：A波-可承受电源130强度 B波-可承受电源100强度 如果按照APP的功能，从 A -> B 时因为强度没变，就会产生强烈的刺痛感，需要手动调节强度,' +
                    '开启本功能后，就会主键避免这种问题，越使用就越精确)',
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
        writeCharts(y, z, time) {
            let dt = time;
            if (this.wavePrevTime) {
                dt = this.wavePrevTime + this.waveY;
            }
            if (!this.waveChartsData) {
                this.waveChartsData = [];
            }
            if (!this.pwChartsData) {
                this.pwChartsData = [];
            }
            // 电源强度
            this.pwChartsData.push([dt, this.data.pw]);
            if (this.pwChartsData.length > 20) {
                this.pwChartsData.shift();
            }

            // 波形数据
            this.waveChartsData.push([dt, z]);
            if (this.waveChartsData.length > 20) {
                this.waveChartsData.shift();
            }

            // else if(this.waveChartsData.length == 1){
            //     this.waveChartsData.unshift([time - 1, 0]);
            //     this.waveChartsData.unshift([time - 1023, 0]);
            //     let emStart = this.waveChartsData.length;
            //     for(emStart;emStart < 20;emStart ++){
            //         this.waveChartsData.unshift([time - (100 * emStart), 0]);
            //     }
            // }

            this.setCharts(this.waveChartsData, this.pwChartsData);
            this.wavePrevTime = time;
            this.waveY = y;
        },
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
            console.log("onPlayWaveClick", e);
            let tar = e.detail;
            let idx = tar.index;
            let list = this.data.playList || [];
            let wave = list[idx];
            if (!wave) {
                wave = tar.wave;
                // 设置播放状态
                wave.status = 'playing';
            }
            let data = {};
            data['playList'] = list;
            data.playingIdx = idx;
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
            if (!(this.data.playList[cha] && this.data.playList[cha].length > 0)) {
                Toast.fail("请添加波形");
                return;
            }
            let idx = this.data.playingIdx;
            let wave = this.data.playList[cha][idx];
            let data = wa.analyzeWave(wave);
            if (!data) {
                Toast.fail("波形解析失败，请编辑后重新尝试或更换波形");
                return;
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
                    that.writeCharts(song.y || 0, song.z || 0, new Date().getTime());
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