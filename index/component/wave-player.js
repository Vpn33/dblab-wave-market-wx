// index/wave-player.js
import Dialog from '@vant/weapp/dialog/dialog';
import wa from "../../lib/wave-analyzer";
import Toast from '@vant/weapp/toast/toast';
import cons from '../../lib/consts';
import '../../lib/lodash-init';
import _ from "lodash";
import * as echarts from '../../lib/echarts.min';
// 这样会污染全局变量 charter 即使多个组件 但charter始终是全局的 渲染会出问题
// var charter = ;

function ecInstance(canvas, width, height, dpr) {
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

    var option = cons.getWaveChartsOpt();
    charter.setOption(option);
    this.setCharter(charter);
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
        powerCaseIdx: -1, // 电源方案选中下标
        ecInstance: {
            channel: null,
            onInit: ecInstance
        },
        pwCaseBtns: {
            toTop: false,
            toUp: false,
            toDown: false,
            toDelete: false
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
        attached: function () {
            // echarts使用组件对象
            let that = this;
            this.setData({
                'ecInstance.setCharter': (c) => {
                    this._charter = c;
                }
            });
        },
        ready: function () {
            // 二进制转xyz
            let data = ["000000000000010111100011",
                "000001101000010111100011",
                "000010100000010111100011",
                "000000111000010111100011",
                "000010100000010111100011",
                "000000000000010111100011",
                "000010100000010111100011",
                "000000101000010111100011",
                "000010100000010111100011",
                "000000000000010111100011",
                "000010100000010111100011",
                "000001001000010111100011",
                "000010100000010111100011",
                "000001110000010111100011",
                "000010100000010111100011"
            ];
            let waveData = wa.binary2WaveData(data);
            console.log("waveData = ", JSON.stringify(waveData, null, 2));


            let rarr = new ArrayBuffer(3);
            let dataView = new DataView(rarr);
            dataView.setUint8(0, parseInt('43', 16));
            dataView.setUint8(1, parseInt('05', 16));
            dataView.setUint8(2, parseInt('0a', 16));
            let rbin = wa.arrayBuffer2Binary(rarr);
            let rData = wa.binary2WaveData(rbin);
            console.log("rin = ", rbin, "data = ", rData);


            // let ct = 10;
            // let d1 = [];

            // setInterval(() => {
            //     let tmp = [];
            //     for (let i = 0; i < 10; i++) {
            //         tmp.push([ct + i, 31]);
            //     }
            //     d1 = d1.concat(tmp);
            //     d1 = _.takeRight(d1, 400);
            //     if (this._charter) {
            //         let min = d1[0][0];
            //         let max = min + 400;
            //         this._charter.setOption({
            //             xAxis: {
            //                 min,
            //                 max
            //             },
            //             series: [{
            //                 data: d1
            //             }, {
            //                 data: []
            //             }]
            //         });
            //     }
            //     ct += 10;
            // }, 1000);

            let that = this;
            this.setData({
                'beforeEditor': function (type, idx, item) {
                    // 如果点击了删除 就必须校验是否正在播放中
                    if (type === 'toDelete') {
                        // 如果正在播放 提示需要停止播放再进行切换
                        let playInfo = that._device.getPlayingInfo(that.data.channel);
                        if (playInfo && playInfo.waveId === item.id) {
                            Dialog.alert({
                                context: that,
                                message: item.name + '正在播放中，不能删除',
                            });
                            return false;
                        }
                    } else if (type === 'toEditor') {
                        // 如果是编辑器模式就清空列表 添加当前波形
                        let pLst = [item];
                        // 设置编辑器模式
                        that._device.setEditing(true, that.data.channel);
                        // 设置播放列表
                        that._device.setPlayList(that.data.channel, pLst);
                        // 如果当前通道正在播放
                        if (that._device.isRunning(that.data.channel)) {
                            // 切换播放
                            that._device.changePlay(that.data.channel, 0);
                        }
                    }
                    let data = {};
                    data['player.activeIdx'] = idx;
                    that._device.activeIdx = idx;
                    that.setData(data);
                    that.savePlayer();
                    console.log("beforeEditor", that, type, idx, item);
                }
            });
            // 图像起始值
            this.chartsCnt = 0;
        },
    },
    /**
     * 组件的方法列表
     */
    methods: {
        setCharter(charter) {
            this._charter = charter;
        },
        closePlay() {
            this.setData({
                playing: false
            });
            // this.clearCharts();
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
        sendedData(song, datetime, charts, channel) {
            // 如果当前通道正在播放 就设置按钮状态
            let playing = this._device.isRunning(channel);
            this.setData({
                playing
            });
            // 如果没有打开图像开关则不显示
            if (!this.data.showCharts) {
                return;
            }

            // 画波形图 
            this.writeCharts(song, datetime, charts);
        },
        choosePower() {
            // 如果正在播放 提示需要停止播放再进行切换
            if (this._device.isRunning(this.data.channel)) {
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
            let sp = _.omit(this.data.player, ['pw']); // 不保存电源强度
            wa.writePlayer(this.data.channel, sp);
        },
        getTotalTime: function (item) {
            if (!item || item <= 0) {
                return '00:00';
            }
            let time = item;
            // 60 * 60
            var hour = parseInt(time / 3600);
            var minute = parseInt((time - hour * 3600) / 60);
            var second = parseInt(time - hour * 3600 - minute * 60);

            var res = '';
            if (hour > 0) {
                res += (hour + '').padStart(2, '0') + ':';
            }
            if (minute >= 0) {
                res += (minute + '').padStart(2, '0') + ':';
            }
            if (second >= 0) {
                res += (second + '').padStart(2, '0');
            }
            return res;
        },
        init: function () {
            this.getTotalTime(6);
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
                    if (this.data.player.autoPwEnabled && this.data.player.autoPwCase && this.data.player.autoPwCase.id) {
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
            // 设置波形默认选择
            this.setData({
                'player.pw': this._device.getPw(this.data.channel),
                'player.activeIdx': this._device.activeIdx
            });
            // 设置发送数据的回调函数
            this._device.setSendedFunc(this.data.channel, this.sendedData, this);
            // 设置 电源改变回调函数
            this._device.setPwChangedFunc(this.data.channel, this.pwChangedData, this);
            // 设置关闭输出回调函数
            this._device.setInvClearFunc(this.data.channel, this.closePlay, this);
            // 设置波形切换回调函数
            this._device.setPlayChangeFunc(this.data.channel, this.playingChange, this);
        },
        playingChange(channel, wave) {
            if (!wave) {
                return;
            }
            // 自动播放改变波形 回调时重新查找id对应的下标
            let idx = this.getWaveIdx(wave.id);
            if (idx > -1) {
                let data = {};
                data['player.activeIdx'] = idx;
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
                message: '开启后播放总时长达到5分钟后会自动记录在播放某个波形小节时的电源强度(电源强度100以上生效)，下次播放时，如果电源强度大于记录的强度，就会自动减小到已记录的强度，当波形结束播放后，电源强度恢复。' +
                    '更智能的避免波形切换时带来的冲击感。(例如：A波-可承受电源130强度 B波-可承受电源100强度 如果按照APP的功能，从 A -> B 时因为强度没变，就会产生强烈的刺痛感，需要手动调节强度,' +
                    '开启本功能后，就会逐渐避免这种问题) 手动记录会直接添加当前电源强度到智能数据库中，不受5分钟的限制，相同的数据会被覆盖。',
            });
        },
        showSyncPwHelp() {
            Dialog.alert({
                context: this,
                message: '开启后会A通道和B通道强度会同步改变,两条通道会设置成相同的通道值。',
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
                message: '往复-[1,2,3][2,1][2,3][2,1]...\n 顺序-[1,2,3] \n 循环-[1,2,3][1,2,3][1,2,3]... \n 随机-[1,3,2][1,1,3][2,3,1]...',
            });
        },
        showAutoPwInvHelp() {
            Dialog.alert({
                context: this,
                message: '开启自动强度后，会按照设定值进行周期性的改变。',
            });
        },
        showAutoPwCaseHelp() {
            Dialog.alert({
                context: this,
                message: '开启自动强度后，会按照自动强度间隔进行周期性的改变,改变值为方案中的设置值。如果方案未选择，则无效。',
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
                message: '开启后，如果播放的波形是双通道的，另一通道被占用的情况下，将会自动停止另一通道的播放，从而播放当前双通道的波形。\n如果不开启，只会播放双通道中当前通道的波形。\n如果关闭当前通道时播放的是双通道波形，另一条通道也会被关闭。',
            });
        },
        togglePlayType() {
            let playType = this.data.player.playType || 0;
            playType++;
            if (playType > 3) {
                playType = 0;
            }
            this.setData({
                'player.playType': playType,
                'playTypeStr': this.data.playTypeList[playType].text
            });
            // 设置播放类型
            this._device.setPlayType(this.data.channel, playType);
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
            this.chartsCnt = 0;
            this.waveChartsData = [];
            this.pwChartsData = [];
            this.setCharts(this.waveChartsData, this.pwChartsData);
            if (this._charter) {
                var option = cons.getWaveChartsOpt();
                this._charter.clear();
                this._charter.setOption(option, false);
            }
        },
        setCharts(waveChartsData, pwChartsData) {
            if (this._charter) {
                this._charter.setOption({
                    series: [{
                        data: waveChartsData
                    }, {
                        data: pwChartsData
                    }]
                });
            }
        },

        writeCharts(song, time, charts) {
            // 返回的图像必须要有值
            if (!(charts && charts.length > 0)) {
                return;
            }
            this.chartsCnt += 10;
            // (x + y) / 100 = 波形数据在100毫秒内会创建几次脉冲
            // let pulseCnt = parseInt((song.x || 0) + (song.y) / 100);
            if (!this.pwChartsData) {
                this.pwChartsData = [];
            }
            if (!this.waveChartsData) {
                this.waveChartsData = [];
            }
            // console.log("charts", JSON.stringify(charts));
            let tmpLst = [];
            for (let i = 0; i < 10; i++) {
                tmpLst.push([this.chartsCnt + i, charts[i]]);
            }
            this.pwChartsData.push([this.chartsCnt, this.data.player.pw]);
            // console.log("song with charts", JSON.stringify(tmpLst));
            this.waveChartsData = this.waveChartsData.concat(tmpLst);
            // 最大显示数据
            this.waveChartsData = _.takeRight(this.waveChartsData, 400);
            this.pwChartsData = _.takeRight(this.pwChartsData, 40);

            if (!this._charter) {
                return;
            }
            // 动态设置最小值
            let min = _.first(this.waveChartsData)[0];
            let max = min + 400;
            this._charter.setOption({
                xAxis: {
                    min,
                    max
                }
            });
            this.setCharts(this.waveChartsData, this.pwChartsData);
        },
        // writeCharts(song, time) {
        //     // (x + y) / 100 = 波形数据在100毫秒内会创建几次脉冲
        //     // let pulseCnt = parseInt((song.x || 0) + (song.y) / 100);
        //     if (!this.pwChartsData) {
        //         this.pwChartsData = [];
        //     }
        //     if (!this.waveChartsData) {
        //         this.waveChartsData = [];
        //     }
        //     if (!this._preTime) {
        //         this._preTime = time;
        //     }

        //     let dt = this._preTime;
        //     if (100 - song.y >= 0) {
        //         let runT = parseInt(100 / song.y);
        //         let modT = parseInt(100 % song.y);
        //         // 小于100毫秒内需要判断脉冲次数
        //         for (let y = 0; y < runT; y++) {
        //             // 循环添加脉冲
        //             for (let i = 0; i < song.x; i++) {
        //                 // console.log("dt = ", dt);
        //                 // 波形数据
        //                 this.waveChartsData.push([dt, song.z]);
        //                 // 电源强度
        //                 this.pwChartsData.push([dt, this.data.player.pw]);
        //                 dt++;
        //             }
        //             dt += song.y;
        //         }
        //         // 还要加上余数的时间
        //         dt += modT;
        //         this._preTime = dt;
        //     } else {
        //         // 大于100毫秒的 直接添加设置下次波形开始时间
        //         // 循环添加脉冲
        //         for (let i = 0; i < song.x; i++) {
        //             // 波形数据
        //             this.waveChartsData.push([dt, song.z]);
        //             // 电源强度
        //             this.pwChartsData.push([dt, this.data.player.pw]);
        //             dt++;
        //         }
        //         this._preTime = dt + song.y;
        //     }
        //     // 最大显示数据
        //     this.waveChartsData = _.takeRight(this.waveChartsData, 300);
        //     this.pwChartsData = _.takeRight(this.pwChartsData, 300);
        //     this.setCharts(this.waveChartsData, this.pwChartsData);
        // },
        subAp(e) {
            let adval = e.target.dataset['adval'] || -1;
            this._device.addPw(this.data.channel, parseInt(adval));
        },
        subLongAp(e) {
            this.subLongApInv = setInterval(() => {
                this.subAp(e);
            }, 100);
        },
        endSubLongAp() {
            clearInterval(this.subLongApInv);
            this.subLongApInv = null;
        },
        addAp(e) {
            let adval = e.target.dataset['adval'] || 1;
            this._device.addPw(this.data.channel, parseInt(adval));
        },
        addLongAp(e) {
            this.addLongApInv = setInterval(() => {
                this.addAp(e);
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
            // 自动强度开关改变
            let data = {};
            if (e.detail === false) {
                // 删除电源方案
                this._device.setAutoPwCase(null);
                data['powerCaseIdx'] = -1;
                data['player.autoPwCase'] = null;
            }
            data['player.autoPwEnabled'] = e.detail
            this._device.setAutoPwEnabled(this.data.channel, e.detail);
            this.setData(data);
            // 保存播放器数据到缓存
            this.savePlayer();
        },
        onAutoPwTypeChange(e) {
            // 自动强度类型改变
            let data = {};
            data['player.autoPwType'] = e.detail;
            // 设置播放器的自动强度类型
            this._device.setAutoPwType(this.data.channel, e.detail);
            this.setData(data);
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
            let data = {};
            // 点击的方案和当前选择的的不一样再切换
            if (tar.id != npc.id) {
                data['powerCaseIdx'] = e.detail.index;
                data['player.autoPwCase'] = tar;

                // 切换电源方案
                let msg = this._device.setAutoPwCase(cha, tar);
                if (msg) {
                    Toast.fail(msg);
                }

            }
            data['showChoosePower'] = false;
            this.setData(data);
            // 保存播放器数据到缓存
            this.savePlayer();
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
            this._device.setPlayList(this.data.channel, data.playList);
            this.setData(data);
            // 写入文件
            wa.writePlayList(this.data.channel, this.data.playList);
            let cha = this.data.channel;
            // 如果正在播放 需要重新计算索引
            if (this._device.isRunning(cha)) {
                let pi = this._device.getPlayingInfo(cha);
                let playIdx = _.findIndex(this.data.playList, {
                    'id': pi.waveId
                });
                let data = {};
                data['player.activeIdx'] = playIdx;
                this.setData(data);
            }
        },
        onPowerCaseChange(e) {
            // 电源方案修改要存储
        },
        onPlayWaveClick(e) {
            // console.log("onPlayWaveClick", e);
            let cha = this.data.channel;
            let tar = e.detail;
            let idx = tar.index;
            // 如果正在播放
            if (this._device.isRunning(cha)) {
                let playingInfo = this._device.getPlayingInfo(cha);
                // 点击的波形和当前播放的不一样再切换
                if (playingInfo.waveId != tar.data.id) {
                    // 切换波形
                    let msg = this._device.changePlay(cha, idx);
                    if (msg) {
                        Toast.fail(msg);
                    }
                }
            }
            let data = {};
            data['player.activeIdx'] = idx;
            this.setData(data);
        },
        togglePlay(e) {
            // 播放通道
            let cha = e.target.dataset['channel'];
            let pl = this.data.playing;
            // 如果有自动强度 要刷新方案
            if (this.data.player.autoPwCase && this.data.player.autoPwCase.id) {
                // 如果电源方案存在 就要设置选中的下标
                if (this.data.powerList && this.data.powerList.length > 0 && this.data.powerCaseIdx) {
                    this.setData({
                        'player.autoPwCase': this.data.powerList[this.data.powerCaseIdx], // 同时刷新一下缓存中的电源方案 避免修改后依然读取缓存的
                    });
                } else if (this.data.powerList.length <= 0) {
                    // 如果电源列表为空 说明一个方案都没有 要清除方案
                    this.setData({
                        'player.autoPwCase': null,
                        'powerCaseIdx': -1
                    });
                }

            }
            // 设置播放索引和点击的索引一致
            this._device.setPlayingIdx(cha, this.data.player.activeIdx);
            // 如果是从停止切换播放 要清空波形图像
            if (!pl === true) {
                this.clearCharts();
            }
            let msg = this._device.togglePlay(cha);
            if (msg) {
                Toast.fail(msg);
                return;
            }
            this.setData({
                playing: !pl
            });
        },
        recAiPw() {
            // 手动记录智能强度
            if (this._device) {
                this._device.recAipwInfo(this.data.channel);
            }
        },
        cleAiPw() {
            // 清空智能强度数据
            if (this._device) {
                Dialog.confirm({
                        context: this,
                        title: '-警告-',
                        message: '是否清空智能强度的记录？',
                    })
                    .then(() => {
                        this._device.cleanAipwInfo();
                        Toast.success('已成功清除智能强度记录');

                    }).catch(() => {
                        // on cancel
                    });

            }
        },
        delAiPw() {
            if (this.data.player.playList.length <= 0) {
                Dialog.alert({
                    context: this,
                    message: '请添加波形！',
                });
            }
            // 删除当前波形智能强度数据
            if (this._device) {
                let idx = this.data.player.activeIdx;
                let playInfo = this.data.player.playList[idx];
                Dialog.confirm({
                        context: this,
                        title: '-警告-',
                        message: '是否删除波形【' + playInfo.name + '】的智能强度的记录？',
                    })
                    .then(() => {
                        this._device.delAipwInfo(playInfo);
                        Toast.success('已成功清除波形【' + playInfo.name + '】的智能强度记录');

                    }).catch(() => {
                        // on cancel
                    });

            }
        }
    }
})