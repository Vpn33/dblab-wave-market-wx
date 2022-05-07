// index/my-home.js
import Dialog from '@vant/weapp/dialog/dialog';
import consts from '../lib/consts';
import '../lib/lodash-init';
import _ from "lodash";
Page({

    /**
     * 页面的初始数据
     */
    data: {
        userInfo: {},
        loaded: [false, false, false, false],
        hasUserInfo: false,
        canIUseGetUserProfile: false,
        filePath: `${wx.env.USER_DATA_PATH}`, // 存储目录
        fileInfo: {}, // 文件信息
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        this.init();
    },
    init() {
        this.setData('loaded', [false, false, false, false]);
        if (wx.getUserProfile) {
            this.setData({
                canIUseGetUserProfile: true
            });
        }
        this.readDir('wave', consts.WAVE_PATH, 0);
        this.readDir('pow', consts.POW_PATH, 1);
        this.readDir('player', consts.PLAY_PATH, 2);
        this.readDir('aiPw', consts.DATA_PATH, 3);
    },
    async readDir(name, path, lodIdx) {
        let that = this;
        const fs = wx.getFileSystemManager();
        fs.readdir({
            dirPath: path,
            async success(res) {
                let fLArr = await that.readFileLength(path, res.files);
                console.log("fLArr=", fLArr);
                let ftotalLgt = _.sumBy(fLArr, f => f.byteLength);
                let data = {};
                data['fileInfo.' + name + 'Cnt'] = res.files.length;
                data['fileInfo.' + name + 'Size'] = ftotalLgt;
                data['loaded[' + lodIdx + ']'] = true;
                console.log("data=", data);
                that.setData(data);
            },
            fail(res) {
                let data = {};
                data['loaded[' + lodIdx + ']'] = true;
                that.setData(data);
            }
        })
    },
    async readFileLength(path, files) {
        let res = new Promise((resolve, reject) => {
            let r = [];
            for (const f of files) {
                let fl = wx.getFileSystemManager().readFileSync(path + f);
                // console.log("fl=", fl);
                r.push({
                    name: f,
                    byteLength: fl.byteLength
                });
            }
            // console.log("resolve files = ", r);
            resolve(r);
        }).catch(e => []);
        return res;
    },
    cleanFile() {
        let that = this;
        Dialog.confirm({
                title: '-警告-',
                message: '是否清空文件存储？\n(清空的数据不可找回)',
            })
            .then(() => {
                // that.init();
                wx.getFileSystemManager().rmdir({
                    dirPath: that.data.filePath,
                    recursive: true,
                    success(res) {
                        that.init();
                    }
                })
            }).catch(() => {
                // on cancel
            });
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
    getUserProfile(e) {
        // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认
        // 开发者妥善保管用户快速填写的头像昵称，避免重复弹窗
        wx.getUserProfile({
            desc: '用于完善会员资料', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
            success: (res) => {
                this.setData({
                    userInfo: res.userInfo,
                    hasUserInfo: true
                })
            }
        })
    },
})