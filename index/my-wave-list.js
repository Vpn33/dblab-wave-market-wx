// index/my-wave-list.js
import wa from "../lib/wave-analyzer";
import Toast from '@vant/weapp/toast/toast';
import tools from '../lib/tools';
import '../lib/lodash-init';
import _ from "lodash";
Page({

    /**
     * 页面的初始数据
     */
    data: {
        waveListOpen: [],
        sortTypeOpt: [{
                text: '倒序',
                value: 0
            },
            {
                text: '正序',
                value: 1
            }
        ],
        sortColOpt: [{
                text: '按名称',
                value: 'name'
            },
            {
                text: '按发布时间',
                value: 'pubTime'
            },
            {
                text: '按创建时间',
                value: 'createTime'
            },
            {
                text: '按评分',
                value: 'tolScore'
            },
            {
                text: '按难度',
                value: 'lv'
            }
        ],
        sortType: 0, // 排序类型 0-倒序 1-正序
        sortCol: 'name', // 排序列 0-名称 1-发布时间 2-创建时间 3-评分 4-难度
        showPlayList: { // 显示播放列表
            a: false,
            b: false
        },
        waveList: [
            // {
            //     id: "1",
            //     name: "潮汐",
            //     author: "XuDL",
            //     pubTime: "2021-01-11 12:23:11",
            //     downTime: "2021-01-11 12:23:11",
            //     a: {},
            //     b: {}
            // },
            // {
            //     id: "2",
            //     name: "呼吸",
            //     author: "XuDL",

            // },
            // {
            //     id: "3",
            //     name: "心跳节奏",
            //     author: "XuDL",
            //     pubTime: "2021-01-11 12:23:11",
            //     downTime: "2021-01-11 12:23:11",
            // },
            // {
            //     id: "4",
            //     name: "连击",
            //     author: "XuDL",
            //     pubTime: "2021-01-11 12:23:11",
            //     downTime: "2021-01-11 12:23:11",
            // },
        ],
        playList: {}, // 播放列表 {a:[], b:[]}
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {

    },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady: function () {

    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow: function () {
        // console.log('我的波形')
        // console.log(moment().format("YYYY-MM-DD HH:mm:ss"));
        this.init();
    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide: function () {

    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {

    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh: function () {
        this.init();
    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom: function () {

    },

    /**
     * 用户点击右上角分享
     */
    onShareAppMessage: function () {

    },
    init: function () {
        let that = this;
        // 初始化标签栏
        this.getTabBar().init();
        // 读取波形列表
        (async () => {
            let waveList = await wa.readWaveList(this.data.sortCol, this.data.sortType);
            console.log("waveList=", waveList);
            if (waveList && waveList.length > 0) {
                that.setData({
                    'waveList': waveList
                })
            }
            //console.log("waveList=", waveList);
        })();
        // 读取播放列表
        (async () => {
            const playList = await wa.readPlayList('a');
            console.log("aPlayList=", playList);
            if (playList) {
                that.setData({
                    'playList.a': playList
                })
            }
        })();
        (async () => {
            const playList = await wa.readPlayList('b');
            console.log("bPlayList=", playList);
            if (playList && (playList.a || playList.b)) {
                that.setData({
                    'playList.b': playList
                })
            }
        })();
    },
    async test() {
        return new Promise((resolve, reject) => {
            wx.getFileSystemManager().readdir({
                dirPath: `${wx.env.USER_DATA_PATH}/xxxx/`,
                success(res) {
                    resolve(res.files);
                },
                fail(res) {
                    reject(res);
                }
            });
        }).catch(e => []);
    },
    toggleOpenCell: function (e) {
        let idx = e.target.dataset['idx'];
        let res = false;
        if (this.data.waveListOpen[idx]) {
            res = this.data.waveListOpen[idx];
        }
        let data = {};
        data['waveListOpen[' + idx + ']'] = !res;
        this.setData(data);
    },
    toEditor: function (e) {
        let idx = e.target.dataset['idx'];
        wx.navigateTo({
            url: 'component/wave-editor?waveId=' + this.data.waveList[idx].id,
        })
    },
    toDelete: async function (e) {
        let idx = e.target.dataset['idx'];
        let waveList = this.data.waveList;
        let wave = this.data.waveList[idx];
        if (!wave.id) {
            return;
        }

        let playList = this.data.playList;
        if (!_.isEmpty(playList)) {
            // 先删除播放列表中的
            let delPath = [];
            let delChannel = [];
            for (let v in playList) {
                let l = playList[v];
                for (let w in l) {
                    if (l[w].id === wave.id) {
                        let p = v + '[' + w + ']';
                        delPath.push(p);
                        delChannel.push(v);
                        break;
                    }
                }
            }
            if (!_.isEmpty(delPath)) {
                // 删除播放列表
                for (let i of delPath) {
                    _.unset(playList, i);
                }

                // 写入文件
                for (let j of delChannel) {
                    let k = _.compact(playList[j]);
                    playList[j] = k;
                    wa.writePlayList(j, k);
                }
                this.setData({
                    playList
                });
            }
        }
        // 再删除波形文件的
        console.log("del wave = ", wave);
        let res = await wa.deleteWave(wave.id);
        if (res) {
            waveList.splice(idx, 1);
            this.setData({
                waveList
            })
        } else {
            Toast.fail("删除失败");
        }
    },
    togglePlayList(e) {
        let cha = e.target.dataset['channel'];
        let show = this.data.showPlayList[cha];
        let data = {};
        data['showPlayList.' + cha] = !show;
        this.setData(data);
    },
    onClosePlayList() {
        this.setData({
            showPlayList: false
        })
    },
    addWave() {
        wx.navigateTo({
            url: 'component/wave-editor',
        })
    },
    existsWave(wave, channelPlayList) {
        if (wave && channelPlayList) {
            return channelPlayList.filter(c => c.id === wave.id).length > 0;
        }
        return false
    },
    addToPlayList(e) {
        let idx = e.target.dataset['idx'];
        let cha = e.target.dataset['channel'];
        let wave = this.data.waveList[idx];
        let list = this.data.playList[cha] || [];
        let waveInf = _.pick(wave, ['id', 'name', 'author', 'ver', 'channelType']);
        // 不存在就添加
        if (!this.existsWave(waveInf, list)) {
            // 如果没有通道类型要设置一下
            if (!waveInf.channelType) {
                if (wave.a && wave.b) {
                    // 双通道
                    waveInf.channelType = '1';
                } else if (wave.stages && wave.stages.length > 0) {
                    // 单通道
                    waveInf.channelType = '0';
                }
            }
            list.unshift(waveInf);
            let data = {};
            data['playList.' + cha] = list;
            this.setData(data);
            // 写入文件
            wa.writePlayList(cha, list);
        }
        Toast.success({
            message: '已加入' + cha.toUpperCase() + '通道'
        });
    },
    onPlayListChange(e) {
        // 播放列表修改要存储
        let cha = e.target.dataset['channel'];
        let list = this.data.playList[cha] || [];
        list = e.detail || [];
        let data = {};
        data['playList.' + cha] = list;
        this.setData(data);
        // 写入文件
        wa.writePlayList(cha, list);
    }

})