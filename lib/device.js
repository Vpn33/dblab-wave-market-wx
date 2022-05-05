import InvWorker from './inv-worker';
import wa from "./wave-analyzer";
import DbChannelState from './dbChannelState';
import Consts from './consts';
import './lodash-init';
import _ from "lodash";
var noWaveData = {
    hz: 0,
    x: 0,
    y: 0,
    z: 0
};
var noWaveCharts = wa.waveData2BinaryStr(noWaveData);
if (noWaveCharts) {
    noWaveData.binaStr = noWaveCharts;
    noWaveData.arrBuffer = wa.binary2SendBuffer(noWaveCharts);
}
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
// 电量改变回调函数
let batteryChangeFunc = null;
// 电量改变回调上下文
let batteryChangeFuncContext = null;
// 播放器信息
let players = {
    a: Consts.getPlayerTmp(), // A播放器
    b: Consts.getPlayerTmp(), // B播放器
};

// 编辑模式
let isEditing = false;

// 进入编辑器的通道 直接从列表进 可能为空  如果从设备进就是有值的
let editChannel = null;

// 正在编辑的波形
let editingWave

// 发送数据计时器
let channelInvWorker = {
    a: new InvWorker(),
    b: new InvWorker()
};

// 双通道的某一个通道临时播放参数
let dbChannelTmp = null;

// 双通道播放状态
let dbChannelState = null;

// 智能强度数据库
let aiPwRec = {};

// 波形图像计数器
let charterTmp = {
    a: Consts.getCharterTmp(),
    b: Consts.getCharterTmp()
};



// 读取智能强度数据
wa.readAiPw().then((aiPw) => {
    aiPwRec = aiPw;
});

/**
 * 添加播放器
 * 
 * @param {*} channel 
 * @param {*} player 
 */
function setPlayer(channel, player) {
    // 如果播放器信息为空就获取默认值
    let p = Object.assign(Consts.getPlayerTmp(), player || {});
    players[channel] = p;
    // 排除不需要缓存的属性
    let tmp = _.omit(p, ['pw', 'playList', 'sendedFunc', 'sendedFuncContext', 'pwChangedFunc', 'pwChangedFuncContext', 'invClearFunc', 'invClearFuncContext']);
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
/**
 * 重置图像参数
 * 
 */
function resetChartsTmp(channel) {
    if (!channel) {
        return;
    }
    charterTmp[channel] = Consts.getCharterTmp();
}
/**
 * 波形转图像
 * 
 * @param {*} song 
 * @param {*} channel 
 */
function songToCharts(song, channel) {
    let tmp = charterTmp[channel];
    let x = song.x || 0,
        y = song.y || 0,
        z = song.z || 0;
    // 计算100毫秒内的脉冲 激活为1 休息为0
    for (let i = 0; i < 100; i++) {
        if ((tmp.pulseAct < x) && (tmp.pulseRst == 0)) {
            tmp.oneHudArr[i] = 1;
            tmp.pulseAct++;
        } else {
            tmp.pulseAct = 0;
            if (tmp.pulseRst < y) {
                tmp.oneHudArr[i] = 0;
                tmp.pulseRst++;
            } else {
                if (x == 0) {
                    tmp.oneHudArr[i] = 0;
                } else {
                    tmp.oneHudArr[i] = 1;
                }
                tmp.pulseAct = 1;
                tmp.pulseRst = 0;
            }
        }
    }
    // 返回图像数组
    let resArr = new Array(10);
    for (let k = 0; k < 10; k++) {
        let j = k * 10;
        // 如果10毫秒内的脉冲全部为0 就为0 如果不为0说明有脉冲 要计算图像(10毫秒一个图像)
        if (tmp.oneHudArr[j] == 0 && tmp.oneHudArr[j + 1] == 0 && tmp.oneHudArr[j + 2] == 0 && tmp.oneHudArr[j + 3] == 0 && tmp.oneHudArr[j + 4] == 0 && tmp.oneHudArr[j + 5] == 0 && tmp.oneHudArr[j + 6] == 0 && tmp.oneHudArr[j + 7] == 0 && tmp.oneHudArr[j + 8] == 0 && tmp.oneHudArr[j + 9] == 0) {
            resArr[k] = 0;
        } else {
            // 计算当前波形的脉冲Z
            resArr[k] = parseInt(tmp.lastZ + (((z - tmp.lastZ) * (k + 1)) / 10));
        }
    }
    // 保留最后一个z 避免断崖式图像 在波形完整播放后需要重置
    tmp.lastZ = z;
    charterTmp[channel] = tmp;
    return resArr;
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
 * 设置电池电量
 */
function setBattery(b) {
    // 设置电源电量
    battery = b || 0;
    if (batteryChangeFunc) {
        let cont = this;
        if (batteryChangeFuncContext) {
            cont = batteryChangeFuncContext;
        }
        batteryChangeFunc.call(cont, battery);
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
 * 存储智能强度的电源
 * @param {
 * } channel 
 */
function setAipwInfo(channel) {
    // 智能强度需要大于100以上才生效
    if (players[channel].pw < 100) {
        return;
    }
    // 如果正在播放才能设置智能强度
    if (channelInvWorker[channel].isRunning) {
        return;
    }
    // 如果开启了智能强度 就需要记录强度值
    if (players[channel].aiPw !== true) {
        return;
    }
    // 获取计时器
    let inv = channelInvWorker[channel];
    if (!inv) {
        return;
    }
    let param = inv.getInvParam();
    // 波形数据已经播放的时长 
    let waveTime = param.wavePlayCnt * inv.invTime / 1000;
    // 如果在最小播放时长以内调节了电源强度才需要记录到智能强度中
    if (waveTime < players[channel].minTime) {
        // {'波形ID_小节索引' = 电源强度}
        aiPwRec[param.waveId + '_' + param.stageIdx] = players[channel].pw;
    }
    wa.writeAiPw(aiPwRec);
}

/**
 * 是否为同步强度
 * 
 * @param {*} channel 
 */
function isSyncPw(channel, cp) {
    // 如果开启了强度同步 就要同时设置另一个通道
    if (players[channel].syncPw === true && cp && cp != 0) {
        let otc = null;
        if (channel === 'a') {
            otc = 'b';
        } else {
            otc = 'a';
        }
        // 获取当前电量
        let p = players[otc].pw || 0;
        // 累加电源电量
        p += cp;
        // 设置电源强度
        setPlayerProps(otc, 'pw', p);
    }
}
/**
 * 设置小节电源增量(小节自动的电源增量不记录智能强度 所以单独设置)
 * @param {*} channel 
 * @param {*} p 
 */
function setStagePw(channel, p) {
    // 电源最大不能超过2047
    if (p > 2047) p = 2047;
    // 电源最小是0
    if (p < 0) p = 0;
    // 设置电源强度
    let np = players[channel].pw;
    // 计算同步值(为正或负)
    let cp = p - np;
    // 设置电源强度
    setPlayerProps(channel, 'pw', p || 0);
    // 是否同步
    isSyncPw(channel, cp);
    // 发送蓝牙数据
    sendAbPwChange2BLE();
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
 * 重置计时器中的电源方案
 */
function resetInvWorkerPwCase(channel) {
    // 获取计时器
    let inv = channelInvWorker[channel];
    if (!inv) {
        return;
    }
    // 获取播放参数
    let param = inv.getInvParam();
    // 删除电源方案相关执行参数
    if (param.pwCase) {
        _.unset(param, 'pwCase');
        _.unset(param, 'pwdIdx');
        _.unset(param, 'basePw');
    }
}

/**
 * 重置计时器中的电源方案
 */
function setInvWorkerBasePw(channel) {
    // 获取计时器
    let inv = channelInvWorker[channel];
    if (!inv) {
        return;
    }
    // 获取播放参数
    let param = inv.getInvParam();
    // 删除电源方案相关执行参数
    if (param.basePw) {
        param.basePw = players[channel].pw;
    }

    // 保存播放参数
    inv.setInvParam(param);
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
                            setBattery(bar);
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
    // console.log(new Date().getTime(), "relfre = ", (song.x + song.y) / 1000, "beFore send channel = ", channel, " WaveData=", song);
    // 蓝牙设备信息如果不存在就跳过发送
    if (!blDecive.deviceId) {
        return;
    }
    wx.writeBLECharacteristicValue({
        deviceId: blDecive.deviceId,
        serviceId: abServiceId,
        characteristicId: chid,
        value: song.arrBuffer,
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
        // 如果不是就是切换播放状态 如果正在运行就要停止(这里执行的是手动的切换的动作函数)
        if (invWorker.isRunning) {
            // 获取播放参数
            let param = invWorker.getInvParam();
            // 如果是双通道的波形
            if (param.wave.channelType === '1') {
                let otParam = othInvWorker.getInvParam();
                // 如果波形是双通道的 且当前播放的波形id和领一条通道相等 就就需要把另外一条通道同时关闭
                if (param.waveId === otParam.waveId) {
                    // 清空波形图像临时变量
                    resetChartsTmp(othInvWorker);
                    othInvWorker.clean();
                }
                // 清空临时播放参数
                dbChannelTmp = null;
                dbChannelState = null;
            }
            // 清空波形图像临时变量
            resetChartsTmp(invWorker);
            invWorker.clean();
            return;
        }
    }
    let lsg = players[cha].playList || [];
    if (!(lsg && lsg.length > 0)) {
        return "请添加波形";
    }
    let idx = players[cha].playingIdx;
    if (playIdx !== null && playIdx !== undefined && playIdx !== NaN) {
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
    runWorker(cha, invWorker, wave,
        songChannel,
        dataIdx
    );
    // 如果波形还是双通道的，就需要把另外一条通道的也打开
    if (wave.channelType === '1') {
        if (dbChannelState === null) {
            dbChannelState = new DbChannelState();
            // 设置主通道(波形播放所在通道)
            dbChannelState.setMainChannel(cha);
            // 设置另一条通道
            dbChannelState.setOtherChannel(othCha);
            dbChannelState.setState(cha, true);
        }
        // 另外一条通道的数据
        let othSongChannel = data[othCha];
        // 如果有另一条通道的数据就需要执行
        if (othSongChannel) {
            // 如果开启了双通道优先的模式 且 另一条通道正在播放 就保存播放参数 停止当前播放
            if (players[cha].dbChannel === true && othInvWorker.isRunning) {
                // 获取当前播放参数
                let tmpInvParam = othInvWorker.getInvParam();
                // 保存到临时变量
                if (tmpInvParam) {
                    dbChannelTmp = tmpInvParam;
                }
                // 清除当前播放的
                othInvWorker.clean();
            }
            // 播放另一条通道
            runWorker(othCha, othInvWorker, wave, othSongChannel, dataIdx);
            dbChannelState.setState(othCha, true);
        }
    }
}

/**
 * 设置定时器的随机输出间隔
 * 
 * @param {*} channel 
 * @param {*} invWorker 
 */
function setInvWorkerRdmStart(channel) {
    let invWorker = channelInvWorker[channel];
    if (!invWorker) {
        return;
    }
    // 工作间隔
    let wst = players[channel].playRdmInv.wStart || 0;
    let wet = players[channel].playRdmInv.wEnd || 0;
    let invParam = invWorker.getInvParam();
    invParam.rdmStart = _.random(wst, wet);
    invWorker.setInvParam(invParam);
    return invParam;
}

/**
 * 设置定时器的随机输出间隔
 * 
 * @param {*} channel 
 * @param {*} invWorker 
 */
function setInvWorkerRdmEnd(channel) {
    let invWorker = channelInvWorker[channel];
    if (!invWorker) {
        return;
    }
    // 暂停间隔
    let pst = players[channel].playRdmInv.pStart || 0;
    let pet = players[channel].playRdmInv.pEnd || 0;
    let invParam = invWorker.getInvParam();
    invParam.rdmEnd = _.random(pst, pet);
    invWorker.setInvParam(invParam);
    return invParam;
}
/**
 * 执行定时器
 * @param {
 * } invWorker 
 * @param {*} invParam 
 */
function runWorker(channel, invWorker, wave, songChannel, dataIdx) {
    let that = this;
    let invParam = Object.assign({}, invWorker.getInvParam(), {
        dataIdx, // 波形播放下标
        wave, // 当前波形
        waveId: wave.id, // 波形id
        wavePlayCnt: 0, // 波形数据已播放次数
        songChannel, // 波形数据
    });
    // 创建定时器执行参数
    invWorker.setInvParam(invParam);
    // 如果开启了随机输出 
    if (players[channel].rdmInvEnabled === true) {
        // 如果已经设置过了 就不用再设置了
        if (!invParam.rdmStart) {
            invParam = setInvWorkerRdmStart(channel);
        }
        // 如果已经设置过了 就不用再设置了
        if (!invParam.rdmEnd) {
            invParam = setInvWorkerRdmEnd(channel);
        }
    }

    // 如果正在执行中 就说明是切换波形 不用重新设置
    if (invWorker.isRunning) {
        return;
    }
    let play = function (param) {
        // 如果暂停播放 就只加次数 不执行播放
        if (param.pause !== true) {
            // 波形播放完毕就重置标志位
            if (param.dataIdx >= param.songChannel.length) {
                param.dataIdx = 0;
            }
            let song = param.songChannel[param.dataIdx];
            if (song) {
                // type=start 小节开始 type=end小节结束
                song = anlySongStart(song, param, channel);
                // 字符串为波形数据 
                if (song) {
                    let time = new Date().getTime();
                    // 发送波形数据
                    sendWaveData(
                        channel,
                        song
                    );

                    // 如果设置了回调 就要调用
                    if (players[channel].sendedFunc) {
                        let ct = this;
                        if (players[channel].sendedFuncContext) {
                            ct = players[channel].sendedFuncContext;
                        }
                        let charts = songToCharts(song, channel);
                        players[channel].sendedFunc.call(ct, song, time, charts, channel);
                    }
                    // 波形结束回调 
                    anlySongEnd.call(this, song, param, channel);

                    // 波形数据下标+1
                    param.dataIdx++;
                    // 如果一个波形内所有小节的数据全部播放完毕，就增加波形播放次数
                    if (param.dataIdx == param.songChannel.length) {
                        // 波形播放次数
                        param.wavePlayCnt++;
                    }
                }
            }
        }
        if (param.pause === true) {
            // 暂停的要回调空的图像
            // 如果设置了回调 就要调用
            if (players[channel].sendedFunc) {
                let ct = this;
                if (players[channel].sendedFuncContext) {
                    ct = players[channel].sendedFuncContext;
                }
                let charts = songToCharts(noWaveData, channel);
                players[channel].sendedFunc.call(ct, noWaveData, new Date().getTime(), charts, channel);
            }
        }

        // 已执行的时间 单位:秒
        let invTotal = (this.invCnt * this.invTime) / 1000;
        // 如果处于暂停播放状态
        if (param.pause === true) {
            // 且设置了休息时长 若总时间大于休息时长结束时间就删除结束休息
            if (param.restTimes && invTotal >= param.restTimes) {
                _.unset(param, 'pause');
                _.unset(param, 'restTimes');
            }
        }
        // 如果不是编辑器模式且设置了自动强度方案 单位:秒
        if (isEditing === false && players[channel].pw > 0 && players[channel].autoPwEnabled === true) {
            // 时长到达自动强度改变的时间 就要改变电源强度
            if (invTotal > 0 && invTotal % players[channel].autoPwInvTime === 0) {
                let cse = players[channel].autoPwCase;
                if (cse) {
                    // 设置计时器中的临时电源方案
                    if (param.pwCase) {
                        // 如果计时器的方案和方案id不一致 说明更换了
                        if (param.pwCase.id !== cse.id) {
                            // 重置计时器中的电源方案
                            param.pwCase = cse;
                            param.pwdIdx = 0;
                        }
                    } else {
                        // 没设置过就直接设置
                        param.pwCase = cse;
                    }
                    let pwdIdx = param.pwdIdx || 0;
                    // 设置计时器中的临时电源下标
                    param.pwdIdx = pwdIdx;
                    let pwMet = cse.metas[pwdIdx];
                    if (pwMet && pwMet.z > 0) {
                        // 设置电源强度
                        // 如果没有基准的电源电量 设置一个 自动电源方案的都走一个基准 当手动改变电源大小时，基准才会改变
                        if (!param.basePw) {
                            param.basePw = players[channel].pw;
                        }
                        setStagePw(channel, param.basePw + pwMet.z);
                    }
                    // 设置下一次电源强度标记
                    powerNext(channel, param);
                }
            }
        }
        // 如果不是编辑器模式且开启了随机输出 
        if (isEditing === false && players[channel].rdmInvEnabled === true) {
            if (!param.rdmTimeStart) {
                // 设置随机开始时间
                param.rdmTimeStart = invTotal + param.rdmStart;
            }
            // 如果时间到达随机的输出时长 就暂停播放 单位:秒
            if (param.pause != true && invTotal > 0 && param.rdmTimeStart && invTotal >= param.rdmTimeStart) {
                param.pause = true;
                // 设置随机暂停结束时间
                param.rdmTimeEnd = invTotal + param.rdmEnd;
                console.log(new Date(), "channel = ", channel, "随机关闭开始 rdm=", [
                    param.rdmStart,
                    param.rdmEnd
                ]);
            }
            // 如果时间大于暂停的停止时间 就开启播放 单位:秒
            if (invTotal > 0 && param.rdmTimeEnd && invTotal >= param.rdmTimeEnd) {
                // 删除暂停标识
                _.unset(param, 'pause');
                // 删除开始时长
                _.unset(param, 'rdmTimeStart');
                // 删除暂停时长
                _.unset(param, 'rdmTimeEnd');
                // 刷新随机间隔
                setInvWorkerRdmStart(channel);
                setInvWorkerRdmEnd(channel);
                console.log(new Date(), "channel = ", channel, "随机关闭结束");
            }
        }

        // 如果不是编辑器模式且开启了定时输出 
        if (isEditing === false && players[channel].invEnabled === true) {
            // 如果时间到达定时输出时长 就停止播放 单位:分
            let invT = (players[channel].playInvTime * 60);
            if (invTotal >= invT) {
                // 到时间了就要停止
                // 设置电源为0 避免再次播放时过于强烈
                setStagePw(channel, 0);
                console.log(new Date(), "channel = ", channel, "定时输出关闭");
                this.clean();
            }
        }
        // 如果不是编辑器模式不是暂停状态且达到最小播放时长 就播放下一首 单位:秒
        // 如果设置了预备下一曲标记也需要检查是否完整播放
        if (isEditing === false && param.pause !== true && invTotal > 0 && ((invTotal % players[channel].minTime === 0) || param.preNext == true)) {
            // 如果当前波形正在播放中 就设一个下一曲的标记 波形总数据长度+1是因为idx会在播放后++ 播放最后一个数据idx就是长度
            if (param.dataIdx < param.songChannel.length) {
                // 预备下一曲标记
                param.preNext = true;
            } else {
                // 移出预备下一曲标记
                _.unset(param, 'preNext');
                // 设置下一曲标记
                param.next = true;
                // 如果是双通道的 要设置当前通道结束
                if (dbChannelState != null) {
                    dbChannelState.setState(channel, false);
                }
            }
        }
        // 如果不是编辑器模式且需要下一曲
        if (isEditing === false && param.next == true) {
            // 如果是双通道的 要检测是否全部都结束了
            if (dbChannelState != null) {
                // 如果双通道有任意一体通道还没结束 就需要等待
                if (!dbChannelState.isRunning()) {
                    // 如果双通道全部都结束了 就播放下一曲
                    let mc = dbChannelState.getMainChannel();
                    if (mc !== null) {
                        // 恢复另一条通道的正常播放
                        reconverWorker();
                        // 主通道直接播放下一曲
                        playNext(mc);
                    }
                }
            } else {
                // 不是双通道的 就播放下一曲
                _.unset(param, 'next');
                playNext(channel);
            }
        } else {
            this.setInvParam(param);
        }

    };
    invWorker.setInvFunc(play);
    if (players[channel].invClearFunc) {
        invWorker.setCleFunc(players[channel].invClearFunc, players[channel].invClearFuncContext);
    }
    invWorker.run();
}
/**
 * 波形播放前解析
 * @param {*} song 
 * @param {*} param 
 * @param {*} channel 
 */
function anlySongStart(song, param, channel) {
    if (song.type) {
        // 小节开始
        if (song.type === 'start') {
            // 记录当前小节索引
            param.stageIdx = song.stageIdx;
            // 计算电源强度是否需要改变
            let pw = players[channel].pw || 0;
            // 手动设置的电源>0
            if (pw > 0) {
                // 如果有电源增量
                if (song.pw) {
                    // 如果设置了自动强度的话 电源增量就无作用了 不用处理
                    if (players[channel].autoPwEnabled !== true) {
                        // 设置电源增量
                        pw = players[channel].pw + song.pw;
                    }
                }
                // 如果开启了智能强度 需要校验电源是否超标
                if (players[channel].aiPw === true) {
                    // 如果智能强度的库中有手动调节的记录 且大于当前电源强度 就使用智能库的电源强度
                    let aiPw = aiPwRec[param.waveId + '_' + param.stageIdx];
                    if (pw && aiPw && pw > aiPw) {
                        pw = aiPw;
                    }
                }
                // 如果有电源强度的改变
                if (pw && pw !== players[channel].pw) {
                    // 记录改变的电源强度 小节结束后还要恢复回来
                    param.pw = pw - players[channel].pw;
                    // 设置电源增量
                    setStagePw(channel, pw);
                }
            }
        }
    }
    return song;
}
/**
 * 波形播放后解析
 * 
 * @param {*} song 
 * @param {*} param 
 * @param {*} channel 
 */
function anlySongEnd(song, param, channel) {
    if (song.type) {
        if (song.type === 'end') {
            // 小节结束
            // 如果播放小节时设置电源强度(电源增量或智能强度) 小节结束就要恢复回来
            if (param.pw) {
                // 取反恢复电源强度
                let p = players[channel].pw + (-song.pw);
                // 删除runner的电源强度参数
                _.unset(param, 'pw');
                // 设置电源增量
                setStagePw(channel, p);
            }
            // 如果有休息时长 就暂停播放 并设置时长
            if (song.restTimes) {
                param.pause = true;
                param.restTimes = ((this.invCnt * this.invTime) + (song.restTimes * 100)) / 1000;
            }
            // 小节结束后重置波形图像参数
            resetChartsTmp(channel);
        }
    }
}
/**
 * 从电源设置电源强度
 */
function powerNext(channel, param) {
    let type = players[channel].autoPwType;
    let idx = param.pwdIdx;
    let powerList = param.pwCase.metas;
    // 如果是编辑器模式就返回
    if (isEditing === true) {
        return;
    }
    // 0-往复 1-顺序 2-循环 3-随机
    switch (type) {
        case '0':
            // 往复
            idx++;
            // 如果全部播放完毕 就将列表反序 并从头开始
            if (idx >= powerList.length) {
                _.reverse(powerList);
                param.pwCase.metas = powerList;
                // 开头和结尾在循环时要跳过 因为已经执行过了 如果为设置下标0则 开头和结尾的时间会变成双倍
                idx = 1;
            }
            break;
        case '1':
            // 顺序
            idx++;
            // 如果全部播放完毕 就停止输出
            if (idx >= powerList.length) {
                idx = powerList.length - 1;
            }
            break;
        case '2':
            // 循环
            idx++;
            // 如果全部播放完毕 就从头开始
            if (idx >= powerList.length) {
                idx = 0;
            }
            break;
        case '3':
            // 随机
            idx = _.random(0, powerList.length - 1);
            break;
    }
    param.pwdIdx = idx;
}
/**
 * 恢复通道
 */
function reconverWorker() {
    let mc = dbChannelState.getMainChannel();
    // 重置主通道参数
    let mcInv = channelInvWorker[mc].getInvParam();
    _.unset(mcInv, 'pause');
    _.unset(mcInv, 'next');
    mcInv.dataIdx = 0;
    channelInvWorker[mc].setInvParam(mcInv);

    // 如果主通道是a 恢复通道就为b
    let recCha = dbChannelState.getOtherChannel();
    let recInvWorker = channelInvWorker[recCha];
    // 如果没有双通道临时变量 说明恢复通道当时是关闭状态 不需要恢复
    if (dbChannelTmp === null) {
        // 直接关闭恢复通道的输出
        recInvWorker.clean();
        // 清空双通道的状态
        dbChannelState = null;
        return;
    }
    // 重设恢复通道的执行状态
    recInvWorker.setInvParam(dbChannelTmp);

    // 清空恢复通道的缓存信息
    dbChannelTmp = null;
    // 清空双通道的状态
    dbChannelState = null;
}
/**
 * 播放下一首
 */
function playNext(channel) {
    let player = players[channel];
    let type = player.playType;
    let idx = player.playingIdx;
    let playList = player.playList;
    // 如果是编辑器模式就返回
    if (isEditing === true) {
        return;
    }
    // 0: 列表循环 1:列表顺序 2:列表随机 3:单曲循环
    switch (type) {
        case 0: // 列表循环
            idx++;
            // 如果全部播放完毕 就从头开始
            if (idx >= playList.length) {
                idx = 0;
            }
            break;
        case 1:
            idx++;
            // 如果全部播放完毕 就停止输出
            if (idx >= playList.length) {
                togglePlay(channel);
                return;
            }
            break;
        case 2:
            // 随机获取列表的一个
            let rdx = idx;
            // 如果随机到自己 就接着随机
            while (rdx == idx) {
                rdx = _.random(0, playList.length - 1);
            }
            idx = rdx;
            break;
        case 3:
            // 单曲循环不用改变
            return;
    }
    setPlayerProps(channel, 'playingIdx', idx);
    togglePlay(channel, idx);
    if (players[channel].playChangeFunc) {
        let cont = this;
        if (players[channel].playChangeFuncContext) {
            cont = players[channel].playChangeFuncContext;
        }
        players[channel].playChangeFunc.call(cont, channel, playList[idx]);
    }
}

export default {
    activeIdx: 0, // 初始化的激活索引
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
    getBattery() {
        // 获取电源电量
        return battery;
    },
    setPlayType(channel, p) {
        // 设置播放类型
        if (channel) {
            setPlayerProps(channel, 'playType', p);
        }
    },
    setPw(channel, p) {
        if (channel) {
            // 电源最大不能超过2047
            if (p > 2047) p = 2047;
            // 电源最小是0
            if (p < 0) p = 0;
            // 设置电源强度
            let np = players[channel].pw;
            // 计算同步值(为正或负)
            let cp = p - np;
            setPlayerProps(channel, 'pw', p || 0);
            // 如果开启了强度同步 就要同时设置另一个通道
            isSyncPw(channel, cp);

            // 手动调节的电源强度才记录智能强度
            if (players[channel].aiPw !== true) {
                setAipwInfo(channel);
            }
            // 手动调节电源强度会需要设置计时器中的电源基准数
            if (players[channel].autoPwEnabled !== true) {
                setInvWorkerBasePw(channel);
            }
            // 发送蓝牙数据
            sendAbPwChange2BLE();
        }
    },
    addPw(channel, addVal) {
        if (channel) {
            let p = players[channel];
            if (p) {
                let tmp = p.pw;
                tmp += addVal
                this.setPw(channel, tmp);
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
            // 重置计时器中的自动强度方案参数
            resetInvWorkerPwCase(channel);
        }
    },
    setAutoPwType(channel, p) {
        // 设置自动强度类型
        if (channel) {
            setPlayerProps(channel, 'autoPwType', p);
            // 类型改变需要重设方案列表 因为往复是根据列表倒序计算的 如果不重新设，方案的顺序会错乱
            if (players[channel].autoPwEnabled) {
                // 重新获取电源方案
                let cse = players[channel].autoPwCase;
                if (cse && cse.metas) {
                    let invParam = invWorker.getInvParam();
                    invParam.pwCase.metas = cse.metas;
                    invWorker.setInvParam(invParam);
                }
            }
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
            // 修改计时器的数据
            setInvWorkerRdmStart(channel);
        }
    },
    setPlayRdmInvWEnd(channel, p) {
        // 设置随机输出-工作间隔结束
        if (channel) {
            setPlayerProps(channel, 'playRdmInv.wEnd', p);
            // 修改计时器的数据
            setInvWorkerRdmStart(channel);
        }
    },
    setPlayRdmInvPStart(channel, p) {
        // 设置随机输出-暂停间隔开始
        if (channel) {
            setPlayerProps(channel, 'playRdmInv.pStart', p);
            // 修改计时器的数据
            setInvWorkerRdmEnd(channel);
        }
    },
    setPlayRdmInvPEnd(channel, p) {
        // 设置随机输出-暂停间隔结束
        if (channel) {
            setPlayerProps(channel, 'playRdmInv.pEnd', p);
            // 修改计时器的数据
            setInvWorkerRdmEnd(channel);
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
    setInvClearFunc(channel, func, context) {
        // 设置发送数据包后回调函数
        if (channel && func) {
            setPlayerProps(channel, 'invClearFunc', func);
            if (context) {
                setPlayerProps(channel, 'invClearFuncContext', context);
            }
        }
    },
    setPlayChangeFunc(channel, func, context) {
        // 设置播放波形改变后回调函数
        if (channel && func) {
            setPlayerProps(channel, 'playChangeFunc', func);
            if (context) {
                setPlayerProps(channel, 'playChangeFuncContext', context);
            }
        }
    },
    setBatteryChangeFunc(func, context) {
        // 设置电池电量改变后回调函数
        batteryChangeFunc = func;
        batteryChangeFuncContext = context;
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
            // 重置计时器中的自动强度方案参数
            resetInvWorkerPwCase(channel);
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
    sendWaveData(channel, e) {
        // 发送波形数据
        sendWaveData(channel, e);
    },
    setPlayer(channel, p) {
        // 设置播放器参数
        if (!channel) {
            return;
        }
        setPlayer(channel, p);
    },
    getPlayingInfo(channel) { // 获取播放波形信息
        if (!channel) {
            return;
        }
        // 获取计时器
        let inv = channelInvWorker[channel];
        if (!inv) {
            return;
        }
        // 如果不是播放状态直接返回
        if (!inv.isRunning) {
            return;
        }
        // 获取播放参数
        let param = inv.getInvParam();
        return {
            wave: param.wave,
            waveId: param.waveId,
            stageIdx: param.stageIdx
        }
    },
    isRunning(channel) { // 检测通道是否正在播放
        if (!channel) {
            return false;
        }
        // 获取计时器
        let inv = channelInvWorker[channel];
        if (!inv) {
            return false;
        }
        return inv.isRunning;
    },
    setEditing(e, channel) {
        // 设置是否为编辑模式
        isEditing = e;
        if (isEditing === true) {
            if (channel) {
                editChannel = channel;
            }
        } else {
            editChannel = null;
        }
    },
    getEditChannel() {
        // 返回编辑器进入通道
        return editChannel;
    },
    isEditing() { // 是否为编辑模式
        return isEditing;
    }
};