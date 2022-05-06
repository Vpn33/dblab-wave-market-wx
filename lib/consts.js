module.exports = {
    POW_PATH: `${wx.env.USER_DATA_PATH}/powers/`,
    WAVE_PATH: `${wx.env.USER_DATA_PATH}/myWaves/`,
    PLAY_PATH: `${wx.env.USER_DATA_PATH}/player/`,
    DATA_PATH: `${wx.env.USER_DATA_PATH}/data/`,
    getWaveChartsOpt: function () {
        // 获取波形和电影图像参数
        return {
            color: ['#F9E49C'],
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
                        color: "#ffebcd"
                    }
                }, {
                    name: "电源强度",
                    textStyle: {
                        color: "#ffebcd"
                    }
                }]
            },
            xAxis: {
                show: true,
                type: 'value',
                min: 1,
                axisLine: { //轴线
                    show: true,
                    lineStyle: {
                        color: '#F9E49C'
                    }
                },
                splitLine: {
                    show: false
                },
                axisTick: { // 刻度
                    show: false
                },
                // splitNumber: 50,
                // interval: 0, // 最小的刻度1
                // maxInterval: 1000, // 最大的刻度1000
                // axisLabel: { // 刻度标签
                //     interval: 0
                // },
            },
            yAxis: [{
                show: true,
                max: 31,
                type: 'value',
                axisLine: {
                    show: true,
                    lineStyle: {
                        color: '#F9E49C'
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
                axisLine: {
                    show: false,
                },
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
                barWidth: 1,
                barGap: '0%',
                /*多个并排柱子设置柱子之间的间距*/
                barCategoryGap: '0%',
                /*多个并排柱子设置柱子之间的间距*/
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

            animation: false, // 不显示动画
        }
    },
    getStageTmp: function () {
        // 获取波形小节模板
        return {
            pw: 0, // 电源增量
            hzType: 1, //频率类型 1-固定 2-节间渐变 3-元内渐变 4-元间渐变 5-阶梯渐变 6-每节随机 7-每元随机
            hz: 10, // 频率1-100[公式计算后 10-1000];
            hzGradient: 0, //  渐变类型 0:小 -> 大 1:大 -> 小
            times: 1, // 小节时长(循环次数)
            metas: [{
                z: 20 // 振幅 0 - 31 20以上更容易引起刺痛
            }], // 默认只有一个元
            restTimes: 0, // 休息时长 单位:毫秒
            balance: 8, // 高低频平衡 1-16 默认8
        };
    },
    getPlayerTmp: function () {
        // 获取播放器模板
        return {
            playType: '0', // 播放类型 0: 列表循环 1:列表顺序 2:列表随机 3:单曲循环
            pw: 0, // 电源强度
            aiPw: true, // 智能强度
            syncPw: false, // 同步强度
            autoPwEnabled: false, // 自动强度
            autoPwEnabled: false, // 自动强度开关
            autoPwType: '0', // 自动强度类型 0-往复 1-顺序 2-循环 3-随机
            autoPwInvTime: 5, // 自动强度改变间隔 单位:秒
            autoPwCase: null, // 自动强度方案
            minTime: 5, // 最小播放时长
            invEnabled: false, // 定时输出开关
            playInvTime: 5, // 定时输出时间间隔 单位:分
            rdmInvEnabled: false, // 随机输出开关
            playRdmInv: { // 随机输出间隔
                wStart: 300, // 工作间隔
                wEnd: 600,
                pStart: 3, // 暂停间隔
                pEnd: 8
            },
            dbChannel: true, // 双通道波形优先
            playList: [], // 播放列表
            playingIdx: 0, // 正在播放的波形索引
            pwChangedFunc: null, // 电源改变回调函数
            sendedFunc: null, // 发送波形回调函数
            isEditing: false, // 是否为编辑模式
        };
    },
    getCharterTmp: function () {
        return {
            pulseAct: 0, // 脉冲激活位
            pulseRst: 0, // 脉冲休息位
            lastZ: 0, // 上一个脉冲的Z(宽度)
            oneHudArr: new Array(100), //  一个波形对应的完整脉冲(一个脉冲生效时间为0.1s[100毫秒] 每毫秒都可能会产生脉冲)
        };
    }
}