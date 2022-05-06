import tools from './tools';
import './lodash-init';
import _ from "lodash";
import consts from './consts';

// let waveTmp = {
//     "name": "潮汐",
//     "a": {
//         "enabled": true,
//         "stages": [{
//             "pw": 0,
//             "hzType": 1,
//             "hz": [
//                 1,
//                 100
//             ],
//             "hzGradient": 0,
//             "times": 3,
//             "metas": [{
//                     "z": 0
//                 },
//                 {
//                     "z": 5
//                 },
//                 {
//                     "z": 10
//                 },
//                 {
//                     "z": 15
//                 },
//                 {
//                     "z": 20
//                 },
//                 {
//                     "z": 25
//                 },
//                 {
//                     "z": 30
//                 },
//                 {
//                     "z": 29
//                 },
//                 {
//                     "z": 28
//                 },
//                 {
//                     "z": 27
//                 },
//                 {
//                     "z": 26
//                 }
//             ]
//         }]
//     }
// };
let POW_PATH = consts.POW_PATH;
let WAVE_PATH = consts.WAVE_PATH;
let PLAY_PATH = consts.PLAY_PATH;
let DATA_PATH = consts.DATA_PATH;
module.exports = {
    readList: async function (fileList, type) {
        let that = this;
        let waveList = [];
        for (const item of fileList) {
            if (type === 'power') {
                let powPro = await that.readPower(item);
                waveList.push(powPro);
            } else {
                let wavePro = await that.readWave(item);
                waveList.push(wavePro);
            }
        }
        return waveList;
    },
    readWaveList: function (sortCol, sortType) {
        let that = this;
        let res = new Promise((resolve, reject) => {
            const fs = wx.getFileSystemManager();
            fs.readdir({
                dirPath: WAVE_PATH,
                async success(res) {
                    let fileArr = res.files;
                    let waveList = await that.readList(fileArr);
                    // 排序
                    waveList.sort((a, b) => {
                        let ac = (a[sortCol] || "").toString();
                        let bc = (b[sortCol] || "").toString();
                        let res = ac.localeCompare(bc);
                        // 0-倒序 1-正序
                        if (sortType == 0) return -res;
                        return res;
                    });
                    resolve(waveList);
                },
                fail(res) {
                    console.error(res);
                    reject(res);
                }
            })
        }).catch(e => []);
        return res;
    },
    readWave: function (id) {
        // 读取波形文件
        if (!id) {
            console.error("called readWave failed, wave id is required!");
            return;
        }
        let waveName = id;
        // 如果不是以dlw结尾 就自动拼接一个
        if (!waveName.endsWith('.dlw')) {
            waveName += '.dlw';
        }
        let res = new Promise((resolve, reject) => {
            wx.getFileSystemManager().readFile({
                filePath: WAVE_PATH + waveName,
                success(res) {
                    try {
                        // 按二进制读取
                        let unit8Arr = new Uint8Array(res.data);
                        let encodedString = String.fromCharCode.apply(null, unit8Arr);
                        // 二进制转换字符串
                        let s = tools.binaryToStr(encodedString);
                        let wave = JSON.parse(s);
                        resolve(wave);
                    } catch (error) {
                        reject(error);
                    }
                },
                fail(res) {
                    console.error(res);
                    reject(res);
                }
            });
        }).catch(e => {});
        return res;
    },
    writeWave: function (wave) {
        // 写入波形文件
        if (!(wave && wave.id)) {
            console.error("wave = " + wave.toString() + " formate is wrong");
            return;
        }
        let res = new Promise((resolve, reject) => {
            const fs = wx.getFileSystemManager();
            fs.mkdir({
                dirPath: WAVE_PATH,
                recursive: true
            });
            // JSON转换为二进制
            let content = tools.strToBinary(JSON.stringify(wave));
            // 写入文件
            fs.writeFile({
                filePath: WAVE_PATH + wave.id + '.dlw',
                data: content,
                encoding: 'binary', // 二进制方式写入
                success(res) {
                    console.log(res.errMsg)
                    resolve(res);
                },
                fail(res) {
                    console.error(res);
                    reject(res);
                }
            });
        });
        return res;
    },
    deleteWave: function (id) {
        // 删除波形文件
        if (!id) {
            console.error("called deleteWave failed, wave id is required!");
            return;
        }
        let res = new Promise((resolve, reject) => {
            const fs = wx.getFileSystemManager();
            fs.unlink({
                filePath: WAVE_PATH + id + '.dlw',
                success(res) {
                    console.log(res);
                    resolve(res);
                },
                fail(res) {
                    console.error(res);
                    reject(res);
                }
            })
        });
        return res;
    },
    analyzeWave: function (wave) {
        let that = this;
        let waveData = {};
        if (wave && wave.id && wave.name) {
            // 单通道
            if (wave.channelType === '0' || (wave.stages && wave.stages.length > 0)) {
                waveData = that.getChannelData(wave);
            } else {
                let aData = that.getChannelData(wave.a);
                if (aData && aData.length > 0) {
                    waveData.a = aData;
                }
                let bData = that.getChannelData(wave.b);
                if (bData && bData.length > 0) {
                    waveData.b = bData;
                }
            }
        }
        return waveData;
    },
    getChannelData(channel) {
        if (!channel) {
            return;
        }
        let that = this;
        let data = [];
        let enable = channel.enabled;
        if (_.isEmpty(enable)) {
            enable = true;
        }
        if (channel && enable) {
            let stageArr = channel.stages;
            if (stageArr && stageArr.length > 0) {
                for (let si = 0; si < stageArr.length; si++) {
                    let st = stageArr[si];
                    let metas = st.metas;
                    // 元数量必须大于0
                    if (!_.isArray(metas) || metas.length <= 0) {
                        continue;
                    }
                    // 小节开始标记
                    let start = {
                        type: 'start', // 开始
                        stageIdx: si // 小节下标
                    };
                    // 小节结束标记
                    let end = {
                        type: 'end', // 结束
                        stageIdx: si // 小节下标
                    };
                    // 如果有电源增量 要设置到data中
                    if (st.pw) {
                        start.pw = st.pw;
                    }
                    // 生成波形xyz数据
                    let gwArr = that.genderWave(st);
                    for (const g of gwArr) {
                        // 计算xyz数据
                        let waveData = g;
                        if (!waveData) {
                            continue;
                        }
                        let binStr = that.waveData2BinaryStr(waveData);
                        if (binStr) {
                            waveData.binaStr = binStr;
                            waveData.arrBuffer = that.binary2SendBuffer(binStr);
                        }
                        data.push(waveData);
                    }
                    // 如果有休息时长也要设置到data 只是振幅为0就可以了
                    if (st.restTimes) {
                        end.restTimes = st.restTimes;
                    }
                    _.merge(_.head(data), start);
                    _.merge(_.last(data), end);
                }
            }
        }
        return data;
    },
    genderWave(stage) { // 生成波形数据
        // 小节总时长(真实时长)
        let stageRealTime = stage.times * stage.metas.length;
        // 小节内元的数量
        let metaCnt = stage.metas.length;
        // 频率类型
        let hzType = stage.hzType;
        // 最小频率
        let hzMin;
        // 最大频率
        let hzMax;
        // 频率数组缓存
        let hzTemp = [];
        // 每次渐变大小
        let grantNum = 0;
        // 小节循环次数
        let stageLoopCnt = parseInt(Math.ceil(stageRealTime / metaCnt));
        // 高低频平衡
        let balance = stage.balance || 8;
        // 最后一个Z
        let lastZ = 0;

        // 这两个参数不知道是干嘛的 未破解
        let f638n = 1;
        let f640p = 99999;

        // 频率类型 0-固定 1-节内渐变 2-元间渐变 3-元内渐变
        if (hzType === 0) {
            hzMin = 0;
            hzMax = stage.hz;
        } else {
            // 渐变类型 0:小 -> 大 1:大 -> 小
            let hzGradient = stage.hzGradient || 0;
            if (hzGradient == 0) {
                hzMin = stage.hz[1] || 10;
                hzMax = stage.hz[0] || 1;
            } else {
                hzMin = stage.hz[0] || 1;
                hzMax = stage.hz[1] || 10;
            }
        }
        hzTemp = [hzMin, hzMax];
        let res = [];

        for (let i = 1; i <= stage.times; i++) {
            for (const m of stage.metas) {
                hzMax = (hzTemp[1] * 20) + 1000;
                hzMin = (hzTemp[0] * 20) + 1000;
                // 计算小节时长 waveClassicBean2.getJ1()值域[0-100] i3 = (int) Math.ceil(Math.pow(((double) (waveClassicBean2.getJ1() + 1)) / 101.0d, 1.6d) * 100.0d);

                // 小节时长 (原本为滑块的小节时长按公式计算的，但这样会缺少部分时长，而且不能无限拓展 所以使用times参数 不再计算)
                // i3 = (int) Math.ceil(Math.pow(((double) (wa.getXiaojieshichang() + 1)) / 101.0d, 1.6d) * 100.0d);

                // f638n和f640p 未破解出是什么参数
                f638n = parseInt(Math.round((stageLoopCnt * (f638n - 1)) / f640p) + 1);
                if (f638n < 1) {
                    f638n = 1;
                }
                f640p = stageLoopCnt;

                // 计算下次渐变的大小
                grantNum = ((grantNum * metaCnt) + 1) / metaCnt;

                // 1-固定 2-节间渐变 3-元内渐变 4-元间渐变 5-阶梯渐变 6-每节随机 7-每元随机
                if (hzType === 4) {
                    if (stageLoopCnt > 1) {
                        hzMax += ((hzMin - hzMax) * (f638n - 1)) / (stageLoopCnt - 1);
                    }
                } else if (hzType === 3) {
                    hzMax = parseInt(hzMax + (((hzMin - hzMax) * ((metaCnt * grantNum) - 1)) / (metaCnt - 1)));
                } else if (hzType === 2) {
                    hzMax = parseInt(hzMax + (((((hzMin - hzMax)) * 1) * (((f638n + (((metaCnt * grantNum) - 1) / ((metaCnt - 1)))) - 1))) /
                        stageLoopCnt));
                }
                let frequency = parseInt(Math.pow(10, hzMax / 1000));
                lastZ = m.z;
                let x = parseInt(Math.pow((frequency) / 1000, 0.5) * balance);
                if (x < 1) {
                    x = 1;
                }
                let y = frequency - x;
                res.push({
                    hz: stage.hz,
                    x,
                    y,
                    z: lastZ
                });

                // 如果渐变>1说明小节内全部元都结束了 要重置渐变大小为0
                if (grantNum >= 1) {
                    grantNum = 0;
                    f638n++;
                    if (f638n > stageLoopCnt) {
                        f638n = 1;
                    } else {
                        continue;
                    }
                } else {
                    continue;
                }
            }
        }
        console.log("gender wave:", res);
        return res;
    },
    getMyChannelData(channel) {
        if (!channel) {
            return;
        }
        let that = this;
        let data = [];
        let enable = channel.enabled;
        if (_.isEmpty(enable)) {
            enable = true;
        }
        if (channel && enable) {
            let stageArr = channel.stages;
            if (stageArr && stageArr.length > 0) {
                for (let si = 0; si < stageArr.length; si++) {
                    let st = stageArr[si];
                    let metas = st.metas;
                    // 元数量必须大于0
                    if (!_.isArray(metas) || metas.length <= 0) {
                        continue;
                    }
                    // 小节开始标记
                    let start = {
                        type: 'start', // 开始
                        stageIdx: si // 小节下标
                    };
                    // 小节结束标记
                    let end = {
                        type: 'end', // 结束
                        stageIdx: si // 小节下标
                    };
                    // 如果有电源增量 要设置到data中
                    if (st.pw) {
                        start.pw = st.pw;
                    }
                    // // 添加开始标记
                    // data.push(start);

                    // 创建需要真实发送的的元数据数组 小节时长 * 元数组 = 总数
                    var workMetas = [];
                    // 循环次数
                    for (let t = 0; t < st.times; t++) {
                        // 复制元数组并添加到数组中
                        workMetas = _.concat(workMetas, _.cloneDeep(metas));
                    }
                    // 波形总次数 = 小节时长/形状时长
                    // 元 = 完整波形(N个振幅) 一个元内有多个振幅 一小节内有多个元
                    // 颗粒摩擦 节内渐变 小节时长内每个振幅均匀根据频率渐变 （低+|高-）&（（高 - 低） / 元总数）* 元总数.index  = hz的大小
                    // 挑逗1 元内渐变 一次完整的波形内频率渐变不管小节时长多少 （低+|高-）&（（高 - 低） / meta.length）* （元总数.index/meta.length） = = hz的大小
                    // 波浪涟漪 元间渐变 小节内的全部振幅作为整体(一次完整波形)根据时长渐变 （低+|高-）&（（高 - 低） / stage.times）*（元总数.index/meta.length） = hz的大小
                    // 频率类型 0-固定 1-节内渐变 2-元间渐变 3-元内渐变
                    switch (st.hzType) {
                        case 0:
                            // 固定
                            // 都设置成同一个值
                            workMetas.map(m => {
                                m.hz = st.hz
                                return m;
                            });
                            break;
                        case 1:
                        case 2:
                        case 3:
                            // 节内渐变
                            // (meta.length * stage.time)=元总数
                            let metaNum = workMetas.length;
                            if (!_.isArray(st.hz)) {
                                st.hz = [st.hz, st.hz];
                            }
                            // 渐变类型
                            let hzGradient = st.hzGradient || 0;

                            // Frequency值域10~1000
                            let lowVal = st.hz[0] || 10;
                            let highVal = st.hz[1] || 10;

                            // 获取频率跳变值
                            let hzInvAdd = 0;
                            let hzInvNum = 1;
                            // 计算跳变间隔数
                            switch (st.hzType) {
                                case 1:
                                    // 节内渐变按每一个元进行改变 上取整
                                    hzInvAdd = _.ceil((highVal - lowVal) / metaNum);
                                    // 节内每一个元都跳变一次
                                    hzInvNum = 1;
                                    break;
                                case 2:
                                    // 元内渐变按元数量计算变化值
                                    hzInvAdd = _.ceil((highVal - lowVal) / metas.length);
                                    break;
                                case 3:
                                    // 元间渐变按小节时长计算变化值
                                    hzInvAdd = _.ceil((highVal - lowVal) / metaNum);
                                    // 一组元结束跳变一次
                                    hzInvNum = metas.length;
                                    break;
                            }
                            // 节内渐变和元间渐变都可以线型设置
                            for (let sn = 0; sn < workMetas.length; sn++) {
                                let hz = 0;
                                // 如果是元内渐变 每个元都跳变 一组元一循环 所以hzInvNum不是固定值
                                if (st.hzType == 2) {
                                    hzInvNum = sn / metas.length;
                                }
                                // 渐变类型 0:高 -> 低 1:低 -> 高
                                if (hzGradient == 0) {
                                    // 频率越小 实际感受的间隔越小
                                    if (st.hzType == 1) {
                                        hz = lowVal + (hzInvAdd * sn);
                                    } else {
                                        hz = lowVal + (hzInvAdd * (sn / hzInvNum).toFixed());
                                    }
                                } else {
                                    // 频率越大 实际感受的间隔越大
                                    if (st.hzType == 1) {
                                        hz = highVal - (hzInvAdd * sn);
                                    } else {
                                        hz = highVal - (hzInvAdd * (sn / hzInvNum).toFixed());
                                    }
                                }
                                // 限制一下大小 别超过了设定的值域
                                if (hz > highVal) {
                                    hz = highVal;
                                } else if (hz < lowVal) {
                                    hz = lowVal;
                                }
                                workMetas[sn].hz = hz;
                            }
                            break;
                    }
                    for (const me of workMetas) {
                        // 计算xyz数据
                        let waveData = that.getWaveData(me.hz, me.z, me.balance);
                        if (!waveData) {
                            continue;
                        }
                        let binStr = that.waveData2BinaryStr(waveData);
                        if (binStr) {
                            waveData.binaStr = binStr;
                            waveData.arrBuffer = that.binary2SendBuffer(binStr);
                        }
                        data.push(waveData);
                    }
                    // 如果有休息时长也要设置到data 只是振幅为0就可以了
                    if (st.restTimes) {
                        end.restTimes = st.restTimes;
                        // for (let r = 0; r < st.restTimes; r++) {
                        //     // 设置1毫秒4
                        //     let waveData = {
                        //         hz: 0,
                        //         x: 1,
                        //         y: 99,
                        //         z: 0
                        //     };
                        //     let binStr = that.waveData2BinaryStr(waveData);
                        //     if (binStr) {
                        //         waveData.binaStr = binStr;
                        //         waveData.arrBuffer = that.binary2SendBuffer(binStr);
                        //     }
                        //     data.push(waveData);
                        // }
                        // end.restTimes = st.restTimes;
                    }
                    _.merge(_.head(data), start);
                    _.merge(_.last(data), end);
                    // // 添加结束标记
                    // data.push(end);
                }
            }
        }
        return data;
    },
    binary2WaveData(binStr) {
        if (!binStr) {
            return;
        }
        if (_.isArray(binStr)) {
            let that = this
            return _.transform(binStr, function (r, v, k) {
                r.push(that.binary2WaveData(v));
            }, []);
        }
        // PWM_AB2	AB两通道强度	23-22bit(保留) 21-11bit(B通道实际强度) 10-0bit(A通道实际强度)
        // PWM_A34	A通道波形数据	23-20bit(保留) 19-15bit(Az) 14-5bit(Ay) 4-0bit(Ax)
        // PWM_B34	B通道波形数据	23-20bit(保留) 19-15bit(Bz) 14-5bit(By) 4-0bit(Bx)
        // 二进制数据必须为24位
        if (binStr.length != 24) {
            return;
        }
        // 去掉前4位0000
        let tmp = binStr.substring(4);
        let binaryString3 = tmp.substring(0, 5);
        let binaryString2 = tmp.substring(5, 15);
        let binaryString1 = tmp.substring(15);
        // 转成10进制
        let res = {
            x: parseInt(binaryString1, 2),
            y: parseInt(binaryString2, 2),
            z: parseInt(binaryString3, 2)
        }
        return res;
    },
    getWaveData(hz, z, balance) {
        // 获取波形XYZ数据
        // hz和z都不能为空
        if (!(hz && z)) {
            return;
        }
        // 高低频平衡 取值[1-16]
        if (!balance) {
            balance = 8;
        } else {
            if (balance > 16) {
                balance = 16
            } else if (balance < 1) {
                balance = 1;
            }
        }
        // 通过官网给定公式计算XY的值
        // 脉冲真实频率 = Frequency / 1000
        // X = ((Frequency / 1000)^ 0.5) * 15
        // Y = Frequency - X
        let x = parseInt(Math.pow(hz / 1000, 0.5) * balance);
        // X的范围是【0-31】 但因为parseInt丢失精度 x的最小值应该是1
        if (x < 1) {
            x = 1;
        } else {
            x = Math.round(x);
            if (x > 31) {
                x = 31;
            }
        }

        // Y的范围是【0-1023】
        let y = hz - x;
        y = Math.round(y);
        if (y < 0) {
            y = 0;
        } else {
            x = Math.round(x);
            if (y > 1023) {
                y = 1023;
            }
        }
        // console.log('x = %s y = %s z = %s', x, y, z);
        // 返回xyz的值
        let res = {
            hz,
            x,
            y,
            z
        };
        return res;
    },
    waveData2BinaryStr({
        x,
        y,
        z
    }) {
        // 转成二进制
        let binaryString = x.toString(2);
        let binaryString2 = y.toString(2);
        let binaryString3 = z.toString(2);
        // PWM_AB2	AB两通道强度	23-22bit(保留) 21-11bit(B通道实际强度) 10-0bit(A通道实际强度)
        // PWM_A34	A通道波形数据	23-20bit(保留) 19-15bit(Az) 14-5bit(Ay) 4-0bit(Ax)
        // PWM_B34	B通道波形数据	23-20bit(保留) 19-15bit(Bz) 14-5bit(By) 4-0bit(Bx)
        // 补全编码 不足位数补0
        while (binaryString.length < 5) {
            binaryString = "0" + binaryString;
        }
        while (binaryString2.length < 10) {
            binaryString2 = "0" + binaryString2;
        }
        while (binaryString3.length < 5) {
            binaryString3 = "0" + binaryString3;
        }
        // 返回二进制字符串
        return "0000" + binaryString3 + binaryString2 + binaryString;
    },
    binary2SendBuffer(binaStr) { // 二进制字符串转arrayBuffer
        let bArr = new ArrayBuffer(3);
        let dataView = new DataView(bArr);
        let arr = new Array();
        for (var i = 0; i < 3; i++) {
            var i2 = i * 8;
            let tempStr = Object.assign(binaStr);
            if (i == 0) {
                arr[2] = this.getBytes(tempStr.substring(i2, i2 + 8));
            } else if (i == 2) {
                arr[0] = this.getBytes(tempStr.substring(i2, i2 + 8));
            } else {
                arr[i] = this.getBytes(tempStr.substring(i2, i2 + 8));
            }
        }
        dataView.setUint8(0, arr[0]);
        dataView.setUint8(1, arr[1]);
        dataView.setUint8(2, arr[2]);
        return bArr;
    },
    getBytes(str) {
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
    },
    readPower: function (id) {
        // 读取电源方案文件
        if (!id) {
            console.error("called readPower failed, power id is required!");
            return;
        }
        let powName = id;
        // 如果不是以dlw结尾 就自动拼接一个
        if (!powName.endsWith('.dlp')) {
            powName += '.dlp';
        }
        let res = new Promise((resolve, reject) => {
            wx.getFileSystemManager().readFile({
                filePath: POW_PATH + powName,
                success(res) {
                    try {
                        // 按二进制读取
                        let unit8Arr = new Uint8Array(res.data);
                        let encodedString = String.fromCharCode.apply(null, unit8Arr);
                        // 二进制转换字符串
                        let s = tools.binaryToStr(encodedString);
                        let pow = JSON.parse(s);
                        resolve(pow);
                    } catch (error) {
                        reject(error);
                    }
                },
                fail(res) {
                    console.error(res);
                    reject(res);
                }
            });
        }).catch(e => {});
        return res;
    },
    readPowerList: function (sortCol, sortType) {
        // 读取电源列表
        let that = this;
        let res = new Promise((resolve, reject) => {
            const fs = wx.getFileSystemManager();
            fs.readdir({
                dirPath: POW_PATH,
                async success(res) {
                    let fileArr = res.files;
                    let powerList = await that.readList(fileArr, 'power');

                    // 排序
                    if (sortCol) {
                        powerList.sort((a, b) => {
                            let ac = (a[sortCol] || "").toString();
                            let bc = (b[sortCol] || "").toString();
                            let res = ac.localeCompare(bc);
                            // 0-倒序 1-正序
                            if (sortType == 0) return -res;
                            return res;
                        });
                    }
                    resolve(powerList);
                },
                fail(res) {
                    console.error(res);
                    reject(res);
                }
            })
        }).catch(e => []);
        return res;
    },
    writePower(power) {
        // 写入电源方案文件
        if (!(power && power.id)) {
            console.error("power = " + power.toString() + " formate is wrong");
            return;
        }
        let res = new Promise((resolve, reject) => {
            const fs = wx.getFileSystemManager();
            fs.mkdir({
                dirPath: POW_PATH,
                recursive: true
            });
            // JSON转换为二进制
            let content = tools.strToBinary(JSON.stringify(power));
            // 写入文件
            fs.writeFile({
                filePath: POW_PATH + power.id + '.dlp',
                data: content,
                encoding: 'binary', // 二进制方式写入
                success(res) {
                    console.log(res.errMsg)
                    resolve(res);
                },
                fail(res) {
                    console.error(res);
                    reject(res);
                }
            });
        });
        return res;
    },
    deletePower: function (id) {
        // 删除电源方案文件
        if (!id) {
            console.error("called deletePower failed, power id is required!");
            return;
        }
        let res = new Promise((resolve, reject) => {
            const fs = wx.getFileSystemManager();
            fs.unlink({
                filePath: POW_PATH + id + '.dlp',
                success(res) {
                    console.log(res);
                    resolve(res);
                },
                fail(res) {
                    console.error(res);
                    reject(res);
                }
            })
        });
        return res;
    },
    readPlayList(channel) {
        if (!channel) {
            return;
        }
        let that = this;
        // 读取播放列表
        let res = new Promise((resolve, reject) => {
            const fs = wx.getFileSystemManager();
            fs.readFile({
                filePath: PLAY_PATH + 'list-' + channel + '.dgp',
                success(res) {
                    try {
                        // 按二进制读取
                        let unit8Arr = new Uint8Array(res.data);
                        let encodedString = String.fromCharCode.apply(null, unit8Arr);
                        // 二进制转换字符串
                        let s = tools.binaryToStr(encodedString);
                        let waveInf = JSON.parse(s);
                        // 如果列表不为空就查询对应的波形文件
                        if (_.isArray(waveInf) && !_.isEmpty(waveInf)) {
                            (async () => {
                                let wave = [];
                                for (let i = 0; i < waveInf.length; i++) {
                                    let w = await that.readWave(waveInf[i].id);
                                    if (w && w.name) {
                                        wave.push(w);
                                    }
                                }
                                resolve(wave);
                            })();

                        }
                    } catch (error) {
                        console.log(error);
                        reject(error);
                    }
                },
                fail(res) {
                    console.error(res);
                    reject(res);
                }
            });

        }).catch(e => []);
        return res;
    },
    writePlayList(channel, playList) {
        // 写入播放列表
        let res = new Promise((resolve, reject) => {
            const fs = wx.getFileSystemManager();
            fs.mkdir({
                dirPath: PLAY_PATH,
                recursive: true
            });
            // JSON转换为二进制
            let content = tools.strToBinary(JSON.stringify(playList));
            // 写入文件
            fs.writeFile({
                filePath: PLAY_PATH + 'list-' + channel + '.dgp',
                data: content,
                encoding: 'binary', // 二进制方式写入
                success(res) {
                    console.log(res.errMsg)
                    resolve(res);
                },
                fail(res) {
                    console.error(res);
                    reject(res);
                }
            });

        }).catch();
        return res;
    },
    deletePlayList: function () {
        // 删除播放列表文件
        let res = new Promise((resolve, reject) => {
            const fs = wx.getFileSystemManager()
            fs.unlink({
                filePath: PLAY_PATH + 'list.dgp',
                success(res) {
                    console.log(res);
                    resolve(res);
                },
                fail(res) {
                    console.error(res);
                    reject(res);
                }
            })
        }).catch();
        return res;
    },
    writePlayer(channel, player) {
        // 写入播放器的数据到缓存 因为播放器数据少 所以缓存够用
        try {
            if (channel && player) {
                // 缓存JSON格式
                let content = JSON.stringify(player);
                wx.setStorageSync('player-' + channel, content);
            }
            return true;
        } catch (e) {
            console.error("exception in writePlayer", e)
            return false;
        }
    },
    readPlayer(channel) {
        // 读取播放器数据
        if (!channel) {
            return;
        }
        let player = null;
        try {
            var val = wx.getStorageSync('player-' + channel);
            if (val) {
                player = JSON.parse(val);
            }
        } catch (e) {
            console.error("exception in readPlayer", e)
        }
        return player;
    },
    checkPlayerAutoPw(channel) {
        //  校验播放器的电源方案是否为自动强度
        let player = this.readPlayer(channel);
        if (!player) {
            return true;
        }
        return player.autoPwEnabled === true ? true : false;
    },
    writePlayerPow(channel, power) {
        // 设置播放器的电源方案
        let player = this.readPlayer(channel);
        if (!player) {
            player = {};
            player.autoPwType = '0';
        }
        player.autoPwEnabled = true;
        player.autoPwCase = power;
        // 写入缓存
        this.writePlayer(channel, player);
    },
    readAiPw() {
        // 读取播放列表
        let res = new Promise((resolve, reject) => {
            const fs = wx.getFileSystemManager();
            fs.readFile({
                filePath: DATA_PATH + 'aipw.dla',
                success(res) {
                    try {
                        // 按二进制读取
                        let unit8Arr = new Uint8Array(res.data);
                        let encodedString = String.fromCharCode.apply(null, unit8Arr);
                        // 二进制转换字符串
                        let s = tools.binaryToStr(encodedString);
                        let aipw = JSON.parse(s);
                        resolve(aipw);
                    } catch (error) {
                        console.log(error);
                        reject(error);
                    }
                },
                fail(res) {
                    console.error(res);
                    reject(res);
                }
            });

        }).catch(e => {
            return {};
        });
        return res;
    },
    writeAiPw(aipw) {
        // 写入智能强度文件
        if (!aipw) {
            console.error("aipw is required");
            return;
        }
        let res = new Promise((resolve, reject) => {
            const fs = wx.getFileSystemManager();
            fs.mkdir({
                dirPath: DATA_PATH,
                recursive: true
            });
            // JSON转换为二进制
            let content = tools.strToBinary(JSON.stringify(aipw));
            // 写入文件
            fs.writeFile({
                filePath: DATA_PATH + 'aipw.dla',
                data: content,
                encoding: 'binary', // 二进制方式写入
                success(res) {
                    console.log(res.errMsg)
                    resolve(res);
                },
                fail(res) {
                    console.error(res);
                    reject(res);
                }
            });
        });
        return res;
    }
}