module.exports = {
    // 定义默认图像参数
    getWaveChartsOpt: function () {
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

            animation: false
        }
    },
    getStageTmp: function () {
        return {
            pw: 0, // 电源增量
            hzType: 0, //频率类型 0-固定 1-节内渐变 2-元内渐变 3-元间渐变
            hz: 1, // 频率
            hzGradient: 0, //  渐变类型 0:高 -> 低 1:低 -> 高
            times: 1, // 小节时长
            metas: [{
                z: 31 // 振幅 0 - 31
            }], // 默认只有一个元
        };
    }
}