import InvWorker from './inv-worker';
module.exports = {
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
                type: 'time',
                axisLine: { //轴线
                    show: true,
                    lineStyle: {
                        color: '#F9E49C'
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

            animation: false, // 不显示动画
        }
    },
    getStageTmp: function () {
        // 获取波形小节模板
        return {
            pw: 0, // 电源增量
            hzType: 0, //频率类型 0-固定 1-节内渐变 2-元内渐变 3-元间渐变
            hz: 10, // 频率10-1000
            hzGradient: 0, //  渐变类型 0:高 -> 低 1:低 -> 高
            times: 1, // 小节时长(循环次数)
            metas: [{
                z: 31 // 振幅 0 - 31
            }], // 默认只有一个元
            restTimes: 0, // 休息时长 单位:毫秒
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
        };
    }
}