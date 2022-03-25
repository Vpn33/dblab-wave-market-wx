// index/my-power-list.js
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
        powerListOpen: [],
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

        powerList: [], // 电源列表[]
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
        // 读取电源列表
        (async () => {
            let powerList = await wa.readPowerList(this.data.sortCol, this.data.sortType);
            console.log("powerList=", powerList);
            if (powerList && powerList.length > 0) {
                that.setData({
                    'powerList': powerList
                })
            }
        })();

    },
    toggleOpenCell: function (e) {
        let idx = e.target.dataset['idx'];
        let res = false;
        if (this.data.powerListOpen[idx]) {
            res = this.data.powerListOpen[idx];
        }
        let data = {};
        data['powerListOpen[' + idx + ']'] = !res;
        this.setData(data);
    },
    toEditor: function (e) {
        let idx = e.target.dataset['idx'];
        wx.navigateTo({
            url: 'component/power-editor?powerId=' + this.data.powerList[idx].id,
        })
    },
    toDelete: async function (e) {
        let idx = e.target.dataset['idx'];
        let powerList = this.data.powerList;
        let power = this.data.powerList[idx];
        if (!power.id) {
            return;
        }
        // 删除电源方案文件的
        console.log("del power = ", power);
        let res = await wa.deletePower(wave.id);
        if (res) {
            // 删除显示列表
            powerList.splice(idx, 1);
            this.setData({
                powerList
            })
        } else {
            Toast.fail("删除失败");
        }
    },
    addPower() {
        wx.navigateTo({
            url: 'component/power-editor',
        })
    },
    setChannel(e) {
        let idx = e.target.dataset['idx'];
        let cha = e.target.dataset['channel'];
        let pow = this.data.powerList[idx];
        let powInf = _.pick(pow, ['id', 'name', 'author', 'ver']);
        // 写入文件
        wa.writePlayerPow(cha, powInf);
        Toast.success({
            message: '电源方案【'+ pow.name + '】已应用到' + cha.toUpperCase() + '通道'
        });
    }

})