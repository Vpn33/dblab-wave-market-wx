// index/wave-player.js
import Dialog from '@vant/weapp/dialog/dialog';
import wa from "../../lib/wave-analyzer";
import Toast from '@vant/weapp/toast/toast';
import cons from '../../lib/consts';
import '../../lib/lodash-init';
import _ from "lodash";
import * as echarts from '../../lib/echarts.min';
let charter = null;

function ecInstance(canvas, width, height, dpr) {
    charter = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: dpr // 像素
    });
    canvas.setChart(charter);

    var option = cons.getWaveChartsOpt();
    charter.setOption(option);
    return charter;
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
    },

    /**
     * 组件的初始数据
     */
    data: {
        showCharts: false, // 是否显示波形图像
        showPlayType: false, //是否显示播放类型 0: 列表循环 1:列表顺序 2:列表随机 3:单曲循环
        playing: false, // 播放中
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
        player: {}, // 播放器对象
        powerList: [], // 电源方案列表
        powerCaseIdx: null, // 电源方案选中下标
        ecInstance: {
            onInit: ecInstance
        }
    },
    pageLifetimes: {
        show: function () {
            // 如果播放器信息为空就获取默认值
            let player = wa.readPlayer(this.data.channel) || cons.getPlayerTmp();
            this.setData({
                player
            });
            let playType = this.data.playTypeList[parseInt(this.data.player.playType || '0')];
            if (!playType) {
                playType = this.data.playTypeList[0];
            }
            this.setData({
                playTypeStr: playType.text
            });
            this.init();
        },
        hide: function () {
            // 隐藏时关闭打开的波形图像
            // this.clearCharts();
        }
    },
    lifetimes: {
        ready: function () {

        },
    },
    /**
     * 组件的方法列表
     */
    methods: {
        closePlay() {
            this.setData({
                playing: false
            });
            // this.clearCharts();
            // // 重新绘图
            // if (charter) {
            //     var option = cons.getWaveChartsOpt();
            //     charter.clear();
            //     charter.setOption(option, false);
            // }
        },
        beforeEditor() {
            // 跳转前如果开启了 就关闭图像

        },
        // 电源通过播放或自动改变的回调
        pwChangedData(ap, bp) {
            let p = ap;
            if (this.data.channel === 'b') {
                p = bp;
            }
            this.setData({
                'player.pw': p
            });
            // this.writePwCharts();
        },
        // 发送数据后的回调
        sendedData(song, datetime) {
            // 发送数据后画波形图
            this.writeCharts(song, datetime);
        },
        choosePower() {
            // 如果正在播放 提示需要停止播放再进行切换
            if (this._device.isRunning) {
                Dialog.alert({
                    context: this,
                    message: '请先停止' + (this.data.channel || "").toUpperCase() + '通道播放,再选择自动强度方案',
                });
                return;
            }
            // 显示选择电源方案列表
            this.setData({
                showChoosePower: true
            });
        },
        onCloseChoosePower() {
            // 关闭选择电源方案列表
            this.setData({
                showChoosePower: false
            });
        },
        savePlayer() {
            // 保存播放器数据到缓存
            wa.writePlayer(this.data.channel, this.data.player);
        },
        init: function () {
            // 读取播放列表
            (async () => {
                const playList = await wa.readPlayList(this.data.channel);
                if (playList) {
                    this._device.setPlayList(this.data.channel, playList);
                    this.setData({
                        'player.playList': playList
                    });
                }
            })();

            // 读取电源方案列表
            (async () => {
                const powerList = await wa.readPowerList();
                if (powerList) {
                    this.setData({
                        powerList
                    });
                    if (this.data.player.autoPwCase && this.data.player.autoPwCase.id) {
                        // 如果缓存的方案在方案列表中不存在了 需要删除缓存中的
                        let caseIdx = _.findIndex(powerList, {
                            'id': this.data.player.autoPwCase.id
                        });
                        if (caseIdx < 0) {
                            this.setData({
                                'player.autoPwCase': null
                            })
                            // 保存播放器数据到缓存
                            this.savePlayer();
                        } else {
                            // 如果电源方案存在 就要设置选中的下标
                            this.setData({
                                'player.autoPwCase': powerList[caseIdx], // 同时刷新一下缓存中的电源方案 避免修改后依然读取缓存的
                                'powerCaseIdx': caseIdx
                            });
                        }

                    }
                }
            })();
            // 获取全局变量蓝牙设备
            if (!this._device) {
                this._device = getApp().blDevice;
                // 设置播放器对象
                this._device.setPlayer(this.data.channel, this.data.player);
            }
            // 设置发送数据的回调函数
            this._device.setSendedFunc(this.data.channel, this.sendedData, this);
            // 设置 电源改变回调函数
            this._device.setPwChangedFunc(this.data.channel, this.pwChangedData, this);
            // 设置关闭输出回调函数
            this._device.setInvClearFunc(this.data.channel, this.closePlay, this);
            // 设置波形切换回调函数
            this._device.setPlayChangeFunc(this.data.channel, this.playingChange, this);
        },
        playingChange(wave) {
            if (!wave) {
                return;
            }
            // 自动播放改变波形 回调时重新查找id对应的下标
            let idx = this.getWaveIdx(wave.id);
            if (idx > -1) {
                let data = {};
                data['player.playingIdx'] = idx;
                // 刷新下标
                this.setData(data);
            }
        },
        getWaveIdx(waveId) {
            if (!waveId) {
                return -1;
            }
            // 查询id对应的波形
            return _.findIndex(this.data.player.playList, {
                'id': waveId
            });
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
                message: '开启后会自动记录在播放某个波形时的电源强度(电源强度100以上生效)，下次播放时，如果电源强度大于记录的强度，就会自动减小到已记录的强度，当波形结束播放后，电源强度恢复。' +
                    '更智能的避免波形切换时带来的冲击感。(例如：A波-可承受电源130强度 B波-可承受电源100强度 如果按照APP的功能，从 A -> B 时因为强度没变，就会产生强烈的刺痛感，需要手动调节强度,' +
                    '开启本功能后，就会主键避免这种问题，越使用就越精确)',
            });
        },
        showSyncPwHelp() {
            Dialog.alert({
                context: this,
                message: '开启后会A通道和B通道强度会同步改变',
            });
        },
        showAutoPwHelp() {
            Dialog.alert({
                context: this,
                message: '开启后通道电源强度会按照设定值周期性的改变(波形数据中设置电源增量会失效)',
            });
        },
        showAutoPwTypeHelp() {
            Dialog.alert({
                context: this,
                message: '往复-[1,2,3][3,2,1][1,2,3][3,2,1]...\n 顺序-[1,2,3] \n 循环-[1,2,3][1,2,3][1,2,3]... \n 随机-[1,3,2][1,1,3][2,3,1]...',
            });
        },
        showAutoPwInvHelp() {
            Dialog.alert({
                context: this,
                message: '开启自动强度后，会按照设定值进行周期性的改变。',
            });
        },
        showMinHelp() {
            Dialog.alert({
                context: this,
                message: '若波形的播放时间小于最小时长，则会在继续播放至最小时长。若播放时间大于最小时长，则会完整播放波形后，才会切换播放下一个波形。',
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
        onPlayTypeChange(e) {
            let val = e.detail.value.value;
            this.setData({
                'player.playType': val,
                playTypeStr: e.detail.value.text,
                showPlayType: false // 关闭弹出
            });
            // 设置播放类型
            this._device.setPlayType(this.data.channel, val);
            // 保存播放器数据到缓存
            this.savePlayer();
        },
        toggleWaveCharts() {
            // 打开或关比波形图像
            this.data.showCharts = !this.data.showCharts;
            if (!this.data.showCharts) {
                this.clearCharts();
            }
            this.setData({
                showCharts: this.data.showCharts
            });
        },
        clearCharts() {
            // 清空图像
            this.waveChartsData = [];
            this.pwChartsData = [];
            this.setCharts(this.waveChartsData, this.pwChartsData);
        },
        setCharts(waveChartsData, pwChartsData) {
            if (charter) {
                charter.setOption({
                    series: [{
                        data: waveChartsData
                    }, {
                        data: pwChartsData
                    }]
                });
            }
        },
        writeCharts(song, time) {
            // (x + y) / 100 = 波形数据在100毫秒内会创建几次脉冲
            // let pulseCnt = parseInt((song.x || 0) + (song.y) / 100);
            if (!this.pwChartsData) {
                this.pwChartsData = [];
            }
            if (!this.waveChartsData) {
                this.waveChartsData = [];
            }
            // // 计算0.1秒 100毫秒内一共有多少次脉冲图像
            // for (let t = 0; t < 100; t++) {
            //     let dt = time + t;
            //     if (0 == (t % song.y)) {
            //         for (let i = 0; i < song.x; i++) {
            //             dt = dt + i;
            //             // 波形数据
            //             this.waveChartsData.push([dt, song.z]);
            //             if (this.waveChartsData.length > 200) {
            //                 this.waveChartsData.shift();
            //                 cg = true;
            //             }
            //         }
            //     }
            // }
            // let inv = song.x + song.y;
            // for (let t = 0; t < 100; t++) {
            //     let dt = time + t;
            //     if (0 == (t % inv)) {
            //         // 波形数据
            //         this.waveChartsData.push([dt, song.z]);
            //         if (this.waveChartsData.length > 50) {
            //             this.waveChartsData.shift();
            //         }
            //         // 电源强度
            //         this.pwChartsData.push([dt, this.data.player.pw]);
            //         if (this.pwChartsData.length > 50) {
            //             this.pwChartsData.shift();
            //         }
            //     }
            // }
            let dt = time;
            // 波形数据
            this.waveChartsData.push([dt, song.z]);
            if (this.waveChartsData.length > 50) {
                this.waveChartsData.shift();
            }
            // 电源强度
            this.pwChartsData.push([dt, this.data.player.pw]);
            if (this.pwChartsData.length > 50) {
                this.pwChartsData.shift();
            }

            this.setCharts(this.waveChartsData, this.pwChartsData);
        },
        subAp() {
            this._device.addPw(this.data.channel, -1);
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
            this._device.addPw(this.data.channel, 1);
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
            // 电源强度手动改变
            let ap = e.detail.value;
            this._device.setPw(this.data.channel, ap);
            this.setData({
                'player.pw': ap
            });
        },
        onAiPwChange(e) {
            // 智能强度改变
            this._device.setAiPw(this.data.channel, e.detail);
            this.setData({
                'player.aiPw': e.detail
            });
            // 保存播放器数据到缓存
            this.savePlayer();
        },
        onSyncPwChange(e) {
            // 同步强度改变
            this._device.setSyncPw(this.data.channel, e.detail);
            this.setData({
                'player.syncPw': e.detail
            });
            // 保存播放器数据到缓存
            this.savePlayer();
        },
        onAutoPwChange(e) {
            // 自动强度改变
            this._device.setAutoPwEnabled(this.data.channel, e.detail);
            this.setData({
                'player.autoPwEnabled': e.detail
            });
            // 保存播放器数据到缓存
            this.savePlayer();
        },
        onAutoPwTypeChange(e) {
            // 自动强度类型改变
            this._device.setAutoPwType(this.data.channel, e.detail);
            this.setData({
                'player.autoPwType': e.detail
            });
            // 保存播放器数据到缓存
            this.savePlayer();
        },
        onAutoPwInvTimeChange(e) {
            //  自动强度改变间隔改变
            this._device.setAutoPwInvTime(this.data.channel, e.detail);
            this.setData({
                'player.autoPwInvTime': e.detail
            });
            // 保存播放器数据到缓存
            this.savePlayer();
        },
        // 切换电源方案
        onPowerCaseClick(e) {
            let cha = this.data.channel;
            let tar = e.detail.data || {};
            let npc = this.data.player.autoPwCase || {};
            // 点击的方案和当前选择的的不一样再切换
            if (tar.id != npc.id) {
                let data = {};
                data['powerCaseIdx'] = e.detail.index;
                data['player.autoPwCase'] = tar;
                data['showChoosePower'] = false;
                // 切换电源方案
                let msg = this._device.setAutoPwCase(cha, tar);
                if (msg) {
                    Toast.fail(msg);
                }
                this.setData(data);
                // 保存播放器数据到缓存
                this.savePlayer();
            }
        },
        onMinTimeChange(e) {
            // 最小播放时长改变
            this._device.setMinTime(this.data.channel, e.detail);
            this.setData({
                'player.minTime': e.detail
            });

            // 保存播放器数据到缓存
            this.savePlayer();
        },
        onInvEnabledChange(e) {
            //  定时输出开关改变
            this._device.setInvEnabled(this.data.channel, e.detail);
            this.setData({
                'player.invEnabled': e.detail
            });
            // 保存播放器数据到缓存
            this.savePlayer();
        },
        onPlayInvTimeChange(e) {
            //  定时输出时间间隔改变
            this._device.setPlayInvTime(this.data.channel, e.detail);
            this.setData({
                'player.playInvTime': e.detail
            });
            // 保存播放器数据到缓存
            this.savePlayer();
        },
        onRdmInvEnabledChange(e) {
            // 随机输出开关改变
            this._device.setRdmInvEnabled(this.data.channel, e.detail);
            this.setData({
                'player.rdmInvEnabled': e.detail
            });
            // 保存播放器数据到缓存
            this.savePlayer();
        },
        onWStartChange(e) {
            // 工作间隔开始 改变
            this._device.setPlayRdmInvWStart(this.data.channel, e.detail);
            this.setData({
                'player.playRdmInv.wStart': e.detail
            });
            // 保存播放器数据到缓存
            this.savePlayer();
        },
        onWEndChange(e) {
            // 工作间隔开始 改变
            this._device.setPlayRdmInvWEnd(this.data.channel, e.detail);
            this.setData({
                'player.playRdmInv.wEnd': e.detail
            });
            // 保存播放器数据到缓存
            this.savePlayer();
        },
        onPStartChange(e) {
            // 工作间隔开始 改变
            this._device.setPlayRdmInvPStart(this.data.channel, e.detail);
            this.setData({
                'player.playRdmInv.pStart': e.detail
            });
            // 保存播放器数据到缓存
            this.savePlayer();
        },
        onPEndChange(e) {
            // 工作间隔开始 改变
            this._device.setPlayRdmInvPEnd(this.data.channel, e.detail);
            this.setData({
                'player.playRdmInv.pEnd': e.detail
            });
            // 保存播放器数据到缓存
            this.savePlayer();
        },
        onDbChannelChange(e) {
            // 双通道波形优先改变
            this._device.setDbChannel(this.data.channel, e.detail);
            this.setData({
                'player.dbChannel': e.detail
            });
            // 保存播放器数据到缓存
            this.savePlayer();
        },
        onPlayListChange(e) {
            // 播放列表修改要存储
            let data = {};
            data['playList'] = e.detail || [];
            let playing = this._device.getPlayingInfo(this.data.channel);
            this.getWaveIdx()
            this._device.setPlayList(this.data.channel, data.playList);
            this.setData(data);
            // 写入文件
            wa.writePlayList(this.data.channel, this.data.playList);
        },
        onPlayWaveClick(e) {
            // console.log("onPlayWaveClick", e);
            let cha = this.data.channel;
            let tar = e.detail;
            let idx = tar.index;
            let nDx = this._device.getPlayingIdx(cha);
            // 点击的波形和当前播放的不一样再切换
            if (idx != nDx) {
                let data = {};
                data['player.playingIdx'] = idx;
                this.setData(data);
                // 如果正在播放
                if (this._device.isRunning(cha)) {
                    // 切换波形
                    let msg = this._device.changePlay(cha, idx);
                    if (msg) {
                        Toast.fail(msg);
                    }
                } else {
                    // 设置索引
                    this._device.setPlayingIdx(cha, idx);
                }
            }
        },
        togglePlay(e) {
            // 播放通道
            let cha = e.target.dataset['channel'];
            let pl = this.data.playing;
            let msg = this._device.togglePlay(cha);
            if (msg) {
                Toast.fail(msg);
                return;
            }
            this.setData({
                playing: !pl
            });
            // if (this.data.playing === false) {
            //     var option = cons.getWaveChartsOpt();
            //     charter.clear();
            //     charter.setOption(option, false);
            // }
        }
        //     togglePlay(e) {
        //         let cha = e.target.dataset['channel'];
        //         let that = this;
        //         let invWorker = this.data.invWorker;
        //         if (invWorker.isRunning) {
        //             invWorker.clean();
        //             this.setData({
        //                 invWorker
        //             });
        //             return;
        //         }
        //         if (!(this.data.playList && this.data.playList.length > 0)) {
        //             Toast.fail("请添加波形");
        //             return;
        //         }
        //         let idx = this.data.playingIdx;
        //         let wave = this.data.playList[idx];
        //         let data = {};
        //         let waveData = wa.analyzeWave(wave);
        //         if (!waveData) {
        //             Toast.fail("波形解析失败，请编辑后重新尝试或更换波形");
        //             return;
        //         }
        //         // 如果是数组 就是单通道的 如果是{} 就是双通道的
        //         if (_.isArray(waveData)) {
        //             data[cha] = waveData;
        //         }
        //         console.log("wave = ", wave.name, "data = ", data);
        //         let songChannel = data[cha];
        //         let dataIdx = 0;
        //         invWorker.setInvFunc(() => {
        //             // 波形播放完毕就重置继续播放
        //             if (dataIdx >= songChannel.length) {
        //                 dataIdx = 0;
        //             }
        //             let song = songChannel[dataIdx];
        //             if (song) {
        //                 that.writeCharts(song, new Date().getTime());
        //                 that.triggerEvent("sendWaveData", {
        //                     channel: cha,
        //                     song
        //                 });
        //             }
        //             dataIdx++;
        //         });
        //         invWorker.setCleFunc(() => {
        //             that.wavePrevTime = null;
        //             that.waveY = null;
        //         });
        //         invWorker.run();
        //         this.setData({
        //             invWorker
        //         })
        //         console.log("invWorker=", invWorker);
        //     }
    }
})