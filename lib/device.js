import InvWorker from './inv-worker';
import wa from "./wave-analyzer";
import Consts from './consts';
import './lodash-init';
import _ from "lodash";
var pwServiceId = "955A180A-0FE2-F5AA-A094-84B8D4F3E8AD",
    abServiceId = "955A180B-0FE2-F5AA-A094-84B8D4F3E8AD",
    abPWChId = "955A1504-0FE2-F5AA-A094-84B8D4F3E8AD",
    pwChId = "955A1500-0FE2-F5AA-A094-84B8D4F3E8AD",
    aChId = "955A1505-0FE2-F5AA-A094-84B8D4F3E8AD",
    bChId = "955A1506-0FE2-F5AA-A094-84B8D4F3E8AD";

// 蓝牙设备信息
let blDecive = {};
// 电源电量
let battery = 0;
// 正在进行蓝牙设备搜索
let _discoveryStarted = false;
// 播放器信息
let players = {
    a: Consts.getPlayerTmp(), // A播放器
    b: Consts.getPlayerTmp(), // B播放器
};

// 发送数据计时器
let channelInvWorker = {
    a: new InvWorker(),
    b: new InvWorker()
};

/**
 * 添加播放器
 * 
 * @param {*} channel 
 * @param {*} player 
 */
function setPlayer(channel, player) {
    // 如果播放器信息为空就获取默认值
    let p = Object.assign(Consts.getPlayerTmp(), player || {});
    // 排除不需要缓存的属性
    let tmp = _.omit(p, ['pw', 'playList', 'sendedFunc', 'pwChangedFunc']);
    tmp.pw = 0;
    tmp.playingIdx = 0;
    wa.writePlayer(channel, tmp);
}
/**
 * 开启蓝牙适配
 */
function openBluetoothAdapter() {
    return new Promise((resolve, reject) => {
        wx.openBluetoothAdapter({
            success: (res) => {
                // 搜索蓝牙设备
                startBluetoothDevicesDiscovery(resolve, reject);
                // 30秒后关闭搜索
                setTimeout(() => {
                    // 如果还在搜索中 且没有设备 说明没有找到 就停止搜索
                    if (blDecive && !blDecive.deviceId) {
                        // 改变蓝牙状态为搜索结束 没有发现设备
                        stopBluetoothDevicesDiscovery();
                        reject('没有发现设备');
                    }
                }, 30000);
            },
            fail: (res) => {
                let msg = getBluetoothAdapterMsg(res);
                if (!msg) {
                    msg = res.errMsg;
                }
                // 如果是设备不可用 可能是被系统禁止了 注册一个状态监听器 一旦恢复 可以继续搜索
                if (res.errCode === 10001) {
                    wx.onBluetoothAdapterStateChange(function (res) {
                        // 设备可用
                        if (res.available) {
                            // 搜索蓝牙设备
                            startBluetoothDevicesDiscovery(resolve, reject);
                        }
                    })
                }
                // 设置错误消息
                if (msg) {
                    reject(msg);
                }
            }
        })
    });
}

function getBluetoothAdapterMsg(res) {
    // 解析蓝牙适配器消息
    let msg = null;
    switch (res.errCode) {
        case 10000:
            msg = '未初始化蓝牙适配器';
            break;
        case 10001:
            msg = '当前蓝牙适配器不可用';
            break;
        case 10002:
            msg = '没有找到指定设备';
            break;
        case 10003:
            msg = '连接失败';
            break;
        case 10004:
            msg = '没有找到指定服务';
            break;
        case 10005:
            msg = '没有找到指定特征';
            break;
        case 10006:
            msg = '当前连接已断开';
            break;
        case 10007:
            msg = '当前特征不支持此操作';
            break;
        case 10008: // 其余所有系统上报的异常
            msg = '蓝牙设备异常';
            break;
        case 10009: // Android 系统特有，系统版本低于 4.3 不支持 BLE
            msg = '您的系统版本过低，不支持BLE设备';
            break;
        case 10012:
            msg = '连接超时';
            break;
        case 10013:
            msg = '连接 deviceId 为空或者是格式不正确';
            break;
    }
    return msg;
}
/**
 * 开启蓝牙搜索
 */
function startBluetoothDevicesDiscovery(resolve, reject) {
    // 搜索蓝牙设备
    // 如果正在搜索就跳过
    if (_discoveryStarted) {
        return;
    }
    // 如果已经连过就直接跳过
    if (blDecive.deviceId) {
        resolve(true);
        return;
    }
    _discoveryStarted = true;
    wx.startBluetoothDevicesDiscovery({
        allowDuplicatesKey: true, // 允许重复key
        success: (res) => {
            // 开启发现蓝牙设备
            onBluetoothDeviceFound(resolve, reject);
        },
    })

}
/**
 * 关闭蓝牙搜索
 */
function stopBluetoothDevicesDiscovery() {
    _discoveryStarted = false;
    // 关闭蓝牙搜索
    wx.stopBluetoothDevicesDiscovery();
}
/**
 * 发现蓝牙设备并连接
 * 
 * @param {*} resolve 
 * @param {*} reject 
 */
function onBluetoothDeviceFound(resolve, reject) {
    try {
        wx.onBluetoothDeviceFound((res) => {
            res.devices.forEach(device => {
                if (!device.name && !device.localName) {
                    return;
                }
                // 过滤DG的设备 其他的蓝牙设备不需要
                if (device.name.toUpperCase().indexOf('D-LAB ESTIM') < 0) {
                    return;
                }
                // 只要找到一个 就添加到设备 停止发现并连接
                blDecive = device;
                resolve(true);
                return false;
            });
        });
    } catch (error) {
        console.log(error);
        reject(error);
    }
}
/**
 * 设置播放器属性
 * @param {*} channel 
 * @param {*} prop 
 * @param {*} val 
 */
function setPlayerProps(channel, prop, val) {
    if (channel && prop) {
        _.set(players[channel], prop, val);
    }
}
/**
 * 遍历执行players
 * 
 * @param {*} loopFunc 
 */
function forInPlayer(loopFunc) {
    _.forIn(players, loopFunc);
}
/**
 * 关闭蓝牙设备连接
 */
function closeBLEConnection() {
    // 如果正在播放通道 要关闭通道的计时器
    forInPlayer((v, k) => {
        if (v.isRunning) {
            v.clean();
        }
    })

    // // 关闭播放通道
    // playChannel = {
    //     a: false,
    //     b: false
    // };

    // 设置电源=0
    setPlayerProps('a', "pw", 0);
    setPlayerProps('b', "pw", 0);
    // 发送电源数据
    sendAbPwChange2BLE();
    // 关闭蓝牙
    if (blDecive.deviceId) {
        wx.closeBLEConnection({
            deviceId: blDecive.deviceId
        });
        // 删除蓝牙设备信息
        blDecive = {};
    }
}
/**
 * 发送电源强度数据到蓝牙设备
 */
function sendAbPwChange2BLE() {
    // 获取双通道的电量
    let ap = players.a.pw || 0;
    let bp = players.b.pw || 0;
    let abPw = getPwBinaryString(ap, bp);
    //let abPw = '000000000000000011010010';
    let buf = getSendBuffer(abPw);
    // 如果设置了 电源改变回调函数 就要回调一下
    forInPlayer((v, k) => {
        if (v.pwChangedFunc) {
            let ct = this;
            if (v.pwChangedFuncContext) {
                ct = v.pwChangedFuncContext;
            }
            v.pwChangedFunc.call(ct, ap, bp);
        }
    });

    console.log("set power a = %s b = %s", ap, bp);
    // 发送数据
    if (!blDecive.deviceId) {
        return;
    }
    wx.writeBLECharacteristicValue({
        deviceId: blDecive.deviceId,
        serviceId: abServiceId,
        characteristicId: abPWChId,
        value: buf,
    });
    console.log("sended power a = %s b = %s", ap, bp);
}
/**
 * 获取电源强度的二进制字符串
 * 
 * @param {*} apw 
 * @param {*} bpw 
 */
function getPwBinaryString(apw, bpw) {
    let astr = apw.toString(2);
    let bstr = bpw.toString(2);
    while (astr.length < 11) {
        astr = "0" + astr;
    }
    while (bstr.length < 11) {
        bstr = "0" + bstr;
    }
    return "00" + bstr + astr;
}

/**
 * arraybuffer 转 字符串
 * @param {*} buf 
 */
function getRecBuffer(buf) {
    const dataView = new DataView(buf);
    let arr = new Array();
    arr[2] = getBinaryStr((dataView.getUint8(0)).toString(2));
    arr[1] = getBinaryStr((dataView.getUint8(1)).toString(2));
    arr[0] = getBinaryStr((dataView.getUint8(2)).toString(2));
    return arr.join('');
}
/**
 * 字符串转二进制并补足8位
 * @param {
 * } str 
 */
function getBinaryStr(str) {
    while (str.length < 8) {
        str = str + '0';
    }
    return str;
}

/**
 * 电源强度字符串转换dataview
 * 
 * @param {*} str 
 */
function getSendBuffer(str) {
    let bArr = new ArrayBuffer(3);
    let dataView = new DataView(bArr);
    let arr = new Array();
    for (var i = 0; i < 3; i++) {
        var i2 = i * 8;
        let tempStr = Object.assign(str);
        if (i == 0) {
            arr[2] = getBytes(tempStr.substring(i2, i2 + 8));
        } else if (i == 2) {
            arr[0] = getBytes(tempStr.substring(i2, i2 + 8));
        } else {
            arr[i] = getBytes(tempStr.substring(i2, i2 + 8));
        }
    }
    dataView.setUint8(0, arr[0]);
    dataView.setUint8(1, arr[1]);
    dataView.setUint8(2, arr[2]);
    return bArr;
}

/**
 *  字符串转byte
 * @param {*} str 
 */
function getBytes(str) {
    if (str == null) {
        throw new Error("when bit string convert to byte, Object can not be null!")
    } else if (8 != str.length) {
        throw new Error("bit string'length must be 8");
    } else {
        try {
            if (str.charAt(0) == '0') {
                return parseInt(str, 2);
            }
            if (str.charAt(0) == '1') {
                return parseInt(str, 2) - 256;
            }
            return 0;
        } catch (err) {
            throw new Error("bit string convert to byte failed, byte String must only include 0 and 1!");
        }
    }
}
/**
 * 关闭蓝牙适配
 */
function closeBluetoothAdapter() {
    if (blDecive.deviceId) {
        wx.closeBluetoothAdapter();
        blDecive = {};
    }
    _discoveryStarted = false;
}
/**
 * arraybuffer转16进制字符串
 * @param {
 * } buffer 
 */
function ab2hex(buffer) {
    var hexArr = Array.prototype.map.call(new Uint8Array(buffer), function (bit) {
        return ('00' + bit.toString(16)).slice(-2);
    });
    return hexArr.join('');
}
/**
 * 连接蓝牙设备
 * @param {
 * } deviceId 
 */
function createBLEConnection() {
    return new Promise((resolve, reject) => {
        let deviceId = blDecive.deviceId;
        if (!deviceId) {
            return reject('没有发现设备，无法进行连接');
        }
        wx.createBLEConnection({
            deviceId,
            success: (res) => {
                // 连接成功 
                // 注册设备监听
                wx.onBLECharacteristicValueChange((characteristic) => {
                    switch (characteristic.characteristicId) {
                        // 读取电池电量
                        case pwChId:
                            let bar = parseInt(ab2hex(characteristic.value), 16);
                            battery = bar;
                            break;
                        case abPWChId:
                            // 读取AB电源强度
                            let abPw = getAbPw(getRecBuffer(characteristic.value));
                            // 设置AB电源强度
                            setPlayerProps('a', "pw", abPw[0] || 0);
                            setPlayerProps('b', "pw", abPw[1] || 0);
                            break;
                    }
                })
                //监听电池电量
                wx.notifyBLECharacteristicValueChange({
                    deviceId,
                    serviceId: pwServiceId,
                    characteristicId: pwChId,
                    state: true,
                });
                // 监听AB电源强度
                wx.notifyBLECharacteristicValueChange({
                    deviceId,
                    serviceId: abServiceId,
                    characteristicId: abPWChId,
                    state: true,
                });
                // 读取电源电量
                wx.readBLECharacteristicValue({
                    deviceId,
                    serviceId: pwServiceId,
                    characteristicId: pwChId,
                });
                // 读取AB通道强度
                wx.readBLECharacteristicValue({
                    deviceId,
                    serviceId: abServiceId,
                    characteristicId: abPWChId,
                });
                resolve(true);
            }
        });
    });
}
/**
 * 获取AB电源强度
 * @param {*} str 
 */
function getAbPw(str) {
    let ts = str.substring(2);
    let aspw = [];
    if (ts.length == 22) {
        aspw[1] = parseInt(ts.substring(0, 12), 2);
        aspw[0] = parseInt(ts.substring(12), 2);
    }
    return aspw;
}
// /**
//  * 打开或关闭通道
//  * @param {*} cn 
//  */
// function toggleChannel(cn) {
//     if (!cn) {
//         return;
//     }
//     let n = cn.toLowerCase();
//     if (n === 'a' || n === 'b') {
//         playChannel[n] = !playChannel[n];
//     }
// }

/**
 * 发送波形数据
 * @param {*} e 
 */
function sendWaveData(channel, song) {

    // 如果没有二进制数据 说明不正确
    if (!(song && song.arrBuffer)) {
        return;
    }
    // 如果没有通道数据 也不正确
    if (!channel) {
        return;
    }
    // 播放列表修改要存储
    let cha = channel;
    // 默认A通道特性UUID
    let chid = aChId;
    // 设置B通道特性UUID
    if (cha === 'b') {
        chid = bChId;
    }
    console.log("beFore send WaveData=", song);
    // 蓝牙设备信息如果不存在就跳过发送
    if (!blDecive.deviceId) {
        return;
    }
    wx.writeBLECharacteristicValue({
        deviceId: blDecive.deviceId,
        serviceId: abServiceId,
        characteristicId: chid,
        value: data.song.arrBuffer,
    });
    console.log("sended WaveData=", song);
}

/**
 * 开始或播放通道
 * @param {*} e 
 */
function togglePlay(channel, playIdx) {
    let cha = channel;
    let invWorker = channelInvWorker[cha];
    let othCha = null;
    let othInvWorker = null;
    // 判断另一通道
    if (cha === 'a') {
        othCha = 'b';
        othInvWorker = channelInvWorker.b;
    } else {
        othCha = 'a';
        othInvWorker = channelInvWorker.a;
    }
    // 如果playIdx为数字 说明是切换 不用停
    if (_.isNumber(playIdx)) {
        // 切换波形必须正在播放状态
        if (!invWorker.isRunning) {
            return;
        }
    } else {
        // 如果不是就是切换播放状态 如果正在运行就要停止
        if (invWorker.isRunning) {
            invWorker.clean();
            return;
        }
    }
    let lsg = players[cha].playList || [];
    if (!(lsg && lsg.length > 0)) {
        return "请添加波形";
    }
    let idx = players[cha].playingIdx;
    if (playIdx) {
        // 如果当前播放和需要播放的索引不同 就要切换波形
        idx = playIdx;
        setPlayerProps(cha, 'playingIdx', idx);
    }

    let wave = lsg[idx];
    let data = {};
    let waveData = wa.analyzeWave(wave);
    if (!waveData) {
        return '波形解析失败，请编辑后重新尝试或更换波形';
    }
    // 如果是数组 就是单通道的 如果是{} 就是双通道的
    if (_.isArray(waveData)) {
        data[cha] = waveData;
    } else {
        data = waveData;
    }
    console.log("play wave at", new Date(), "channel = ", cha, " wave = ", wave.name, " data = ", data);
    let songChannel = data[cha];
    let dataIdx = 0;
    // 播放波形
    runWorker(cha, invWorker,
        songChannel,
        dataIdx
    );
    // 如果开启了双通道优先的模式，就需要把另外一条通道的数据也设置好
    if (players[cha].dbChannel === true) {
        // 另外一条通道的数据
        let othSongChannel = data[othCha];
        // 如果有另一条通道的数据就需要执行
        if (othSongChannel) {
            runWorker(othCha, othInvWorker,
                othSongChannel,
                dataIdx
            );
        }
    }
}

/**
 * 执行定时器
 * @param {
 * } invWorker 
 * @param {*} invParam 
 */
function runWorker(channel, invWorker, songChannel, dataIdx) {
    let that = this;
    let invParam = {
        invCnt: 0, // 已执行次数
        dataIdx, // 波形播放下标
        songChannel, // 波形数据
    };
    // 如果开启了随机输出 
    if (players[channel].rdmInvEnabled === true) {
        // 计算随机工作间隔和暂停间隔
        let wst = players[channel].playRdmInv.wStart || 0;
        let wet = players[channel].playRdmInv.wEnd || 0;
        let pst = players[channel].playRdmInv.pStart || 0;
        let pet = players[channel].playRdmInv.pEnd || 0;
        invParam.rdmStart = _.random(wst, wet);
        invParam.rdmEnd = _.random(pst, pet);
    }
    // 创建定时器执行参数
    invWorker.setInvParam(invParam);
    // 如果正在执行中 就说明是切换波形 不用重新设置
    if (!invWorker.isRunning) {
        let play = function (param) {
            // 如果暂停播放 就只加次数 不执行播放
            if (param.pause === true) {
                param.invCnt++;
                this.setInvParam(param);
                return;
            }
            let song = param.songChannel[param.dataIdx];
            if (song) {
                let time = new Date().getTime();
                // 发送波形数据
                sendWaveData(
                    param.channel,
                    song
                );

                // 如果设置了回调 就要调用
                if (players[channel].sendedFunc) {
                    let ct = this;
                    if (players[channel].sendedFuncContext) {
                        ct = players[channel].sendedFuncContext;
                    }
                    players[channel].sendedFunc.call(ct, song, time, channel);
                }
                // that.writeCharts(song, new Date().getTime());
                // that.triggerEvent("sendWaveData", );
            }
            param.dataIdx++;
            param.invCnt++;
            // 已执行的时间 单位:秒
            let invTotal = (param.invCnt * this.invTime) / 1000;
            // 如果开启了随机输出 
            if (players[channel].rdmInvEnabled === true) {
                // 如果时间到达随机的输出时长 就暂停播放 单位:秒
                if (invTotal >= param.rdmStart) {
                    param.pause = true;
                }
                // 如果时间大于暂停的时长 就开启播放 单位:秒
                if (invTotal >= param.rdmStart + param.rdmEnd) {
                    param.pause = false;
                }
            }
            this.setInvParam(param);
            // 如果开启了定时输出 
            if (players[channel].invEnabled === true) {
                // 如果时间到达定时输出时长 就停止播放 单位:分
                let invT = (players[channel].playInvTime * 60);
                if (invTotal >= invT) {
                    // 到时间了就要停止
                    this.clean();
                }
            }
            // 如果达到最小播放时长 就播放下一首 单位:秒
            if ((invTotal % players[channel].minTime === 0)) {
                // 如果当前波形正在播放中 就设一个下一曲的标记
                if (param.dataIdx != param.songChannel.length - 1) {
                    param.next = true;
                    this.setInvParam(param);
                } else {
                    // 如果波形正好播放完就直接下一曲
                    playNext(channel);
                }
            }
            // 波形播放完毕就重置标志位继续播放
            if (param.dataIdx >= param.songChannel.length) {
                // 如果播放完毕后发现需要下一曲
                if (param.next == true) {
                    playNext(channel);
                }
                param.dataIdx = 0;
            }
        };
        invWorker.setInvFunc(play);
        invWorker.run();
    }
}

/**
 * 播放下一首
 */
function playNext(channel) {
    let player = players[channel];
    let type = player.playType;
    let idx = player.playingIdx;
    let playList = player.playList;
    // 0: 列表循环 1:列表顺序 2:列表随机 3:单曲循环
    switch (type) {
        case '0': // 列表循环
            idx++;
            // 如果全部播放完毕 就从头开始
            if (idx >= playList.length) {
                idx = 0;
            }
            break;
        case '1':
            idx++;
            // 如果全部播放完毕 就停止输出
            if (idx >= playList.length) {
                togglePlay(channel);
                return;
            }
            break;
        case '2':
            // 随机获取列表的一个
            idx = _.random(0, playList.length - 1);
            break;
        case '3':
            // 单曲循环不用改变
            return;
    }
    setPlayerProps(channel, 'playingIdx', idx);
    togglePlay(channel, idx);
}

export default {
    getId() {
        // 获取设备id
        return blDecive.deciveId;
    },
    set(blObj) {
        // 设置蓝牙设备信息
        blDecive = blObj;
    },
    get() {
        // 获取蓝牙设备信息
        return blDecive;
    },
    isDiscoveryStarted() {
        return _discoveryStarted;
    },
    setBattery(b) {
        // 设置电源电量
        battery = b;
    },
    getBattery(b) {
        // 获取电源电量
        return battery;
    },
    setPw(channel, p) {
        if (channel) {
            // 设置电源强度
            setPlayerProps(channel, 'pw', p || 0);
            // 发送蓝牙数据
            sendAbPwChange2BLE();
        }
    },
    addPw(channel, addVal) {
        if (channel) {
            let p = players[channel];
            if (p) {
                p.pw += addVal
                // 电源最大不能超过2047
                if (p.pw > 2047) p.pw = 2047;
                // 电源最小是0
                if (p.pw < 0) p.pw = 0;
                // 发送蓝牙数据
                sendAbPwChange2BLE();
            }
        }
    },
    getPw(channel) {
        // 获取电源强度
        if (channel) {
            return players[channel].pw;
        }
        return;
    },
    setAiPw(channel, p) {
        // 设置智能强度
        if (channel) {
            setPlayerProps(channel, 'aiPw', p);
        }
    },
    setSyncPw(channel, p) {
        // 设置同步强度
        if (channel) {
            setPlayerProps(channel, 'syncPw', p);
        }
    },
    setAutoPwEnabled(channel, p) {
        // 设置自动强度
        if (channel) {
            setPlayerProps(channel, 'autoPwEnabled', p);
        }
    },
    setAutoPwType(channel, p) {
        // 设置自动强度类型
        if (channel) {
            setPlayerProps(channel, 'autoPwType', p);
        }
    },
    setAutoPwInvTime(channel, p) {
        // 设置自动强度改变间隔
        if (channel) {
            setPlayerProps(channel, 'autoPwInvTime', p);
        }
    },
    setMinTime(channel, m) {
        // 设置最小时长
        if (channel) {
            setPlayerProps(channel, 'minTime', m);
        }
    },
    setInvEnabled(channel, i) {
        // 设置定时输出
        if (channel) {
            setPlayerProps(channel, 'invEnabled', i);
        }
    },
    setPlayInvTime(channel, p) {
        // 设置定时输出
        if (channel) {
            setPlayerProps(channel, 'playInvTime', p);
        }
    },
    setRdmInvEnabled(channel, r) {
        // 设置随机输出
        if (channel) {
            setPlayerProps(channel, 'rdmInvEnabled', r);
        }
    },
    setPlayRdmInvWStart(channel, p) {
        // 设置随机输出-工作间隔开始
        if (channel) {
            setPlayerProps(channel, 'playRdmInv.wStart', p);
        }
    },
    setPlayRdmInvWEnd(channel, p) {
        // 设置随机输出-工作间隔结束
        if (channel) {
            setPlayerProps(channel, 'playRdmInv.wEnd', p);
        }
    },
    setPlayRdmInvPStart(channel, p) {
        // 设置随机输出-暂停间隔开始
        if (channel) {
            setPlayerProps(channel, 'playRdmInv.pStart', p);
        }
    },
    setPlayRdmInvPEnd(channel, p) {
        // 设置随机输出-暂停间隔结束
        if (channel) {
            setPlayerProps(channel, 'playRdmInv.pEnd', p);
        }
    },
    setDbChannel(channel, d) {
        // 设置双通道优先
        if (channel) {
            setPlayerProps(channel, 'dbChannel', d);
        }
    },
    setPlayList(channel, list) {
        // 设置播放列表
        if (channel) {
            setPlayerProps(channel, 'playList', list || []);
        }
    },
    setPlayingIdx(channel, i) {
        // 设置播放下标
        if (channel) {
            setPlayerProps(channel, 'playingIdx', i || 0);
        }
    },
    // toggleChannel(cn) {
    //     // 打开或关闭通道
    //     toggleChannel(cn);
    // },
    setPwChangedFunc(channel, func, context) {
        // 设置电源强度被 波形电源强度/智能强度/同步强度/自动强度 改变后的回调函数
        if (channel && func) {
            setPlayerProps(channel, 'pwChangedFunc', func);
            if (context) {
                setPlayerProps(channel, 'pwChangedFuncContext', context);
            }
        }
    },
    setSendedFunc(channel, func, context) {
        // 设置发送数据包后回调函数
        if (channel && func) {
            setPlayerProps(channel, 'sendedFunc', func);
            if (context) {
                setPlayerProps(channel, 'sendedFuncContext', context);
            }
        }
    },
    getPlayingIdx(channel) {
        // 获取某通道当前播放索引
        if (channel) {
            return players[channel].playingIdx;
        }
        return;
    },
    setPlayingIdx(channel, idx) {
        // 设置某通道当前播放索引
        if (channel) {
            setPlayerProps(channel, 'playingIdx', idx || 0);
        }
        return;
    },
    setAutoPwCase(channel, pwCase) {
        // 设置电源方案
        if (channel) {
            // 设置电源方案
            setPlayerProps(channel, 'autoPwCase', pwCase);
            // 重置电源播放下标

        }
        return;
    },
    startDiscovery() {
        // 开启蓝牙发现
        return openBluetoothAdapter();
    },
    stopDiscovery() {
        // 停止蓝牙发现
        stopBluetoothDevicesDiscovery();
    },
    getConnection() {
        // 创建蓝牙连接
        return createBLEConnection();
    },
    disConnection() {
        // 关闭蓝牙连接
        closeBLEConnection();
        // 关闭蓝牙适配
        closeBluetoothAdapter();
    },
    togglePlay(channel) {
        // 开始播放或关闭
        return togglePlay(channel);
    },
    changePlay(channel, playIdx) {
        // 切换播放
        return togglePlay(channel, playIdx);
    },
    sendWaveData(e) {
        // 发送波形数据
        sendWaveData(e);
    },
    setPlayer(channel, p) {
        // 设置播放器参数
        if (!channel) {
            return;
        }
        setPlayer(channel, p);
    }
};