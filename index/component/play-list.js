// index/component/play-list.js
Component({
    /**
     * 组件的属性列表
     */
    properties: {
        playList: {
            type: Array,
            value: [{
                    id: "1",
                    name: "潮汐",
                    author: "XuDL",
                    pubTime: "2021-01-11 12:23:11",
                    downTime: "2021-01-11 12:23:11",
                    a: {},
                    b: {}
                },
                {
                    id: "2",
                    name: "呼吸",
                    author: "XuDL",

                },
                {
                    id: "3",
                    name: "心跳节奏",
                    author: "XuDL",
                    pubTime: "2021-01-11 12:23:11",
                    downTime: "2021-01-11 12:23:11",
                },
                {
                    id: "4",
                    name: "连击",
                    author: "XuDL",
                    pubTime: "2021-01-11 12:23:11",
                    downTime: "2021-01-11 12:23:11",
                },
                {
                    id: "1",
                    name: "潮汐",
                    author: "XuDL",
                    pubTime: "2021-01-11 12:23:11",
                    downTime: "2021-01-11 12:23:11",
                },
                {
                    id: "2",
                    name: "呼吸",
                    author: "XuDL",

                },
                {
                    id: "3",
                    name: "心跳节奏",
                    author: "XuDL",
                    pubTime: "2021-01-11 12:23:11",
                    downTime: "2021-01-11 12:23:11",
                },
                {
                    id: "4",
                    name: "连击",
                    author: "XuDL",
                    pubTime: "2021-01-11 12:23:11",
                    downTime: "2021-01-11 12:23:11",
                },
                {
                    id: "1",
                    name: "潮汐",
                    author: "XuDL",
                    pubTime: "2021-01-11 12:23:11",
                    downTime: "2021-01-11 12:23:11",
                },
                {
                    id: "2",
                    name: "呼吸",
                    author: "XuDL",

                },
                {
                    id: "3",
                    name: "心跳节奏",
                    author: "XuDL",
                    pubTime: "2021-01-11 12:23:11",
                    downTime: "2021-01-11 12:23:11",
                },
                {
                    id: "4",
                    name: "连击",
                    author: "XuDL",
                    pubTime: "2021-01-11 12:23:11",
                    downTime: "2021-01-11 12:23:11",
                }
            ],
        }
    },

    /**
     * 组件的初始数据
     */
    data: {

    },

    /**
     * 组件的方法列表
     */
    methods: {
        toTop(e) {
            let idx = e.target.dataset['idx'];
            let list = this.data.playList || [];
            // 已经是第一个不用动
            if (idx <= 0) {
                return;
            }
            // unshift 向数组的开头添加一个或更多元素，并返回新的长度。
            list.unshift(list.splice(idx, 1)[0]);
            this.setData({
                'playList': list
            });
            this.triggerEvent('change', list);
        },
        toUp(e) {
            let idx = e.target.dataset['idx'];
            let list = this.data.playList || [];
            // 已经是第一个不用动
            if (idx <= 0) {
                return;
            }
            let midx = idx--;
            // 互换位置 [1, 2, 3] -> [1, 1, 3] -> [2, 1, 3]
            list[idx] = list.splice(midx, 1, list[idx])[0];

            this.setData({
                'playList': list
            });
            this.triggerEvent('change', list);
        },
        toDown(e) {
            let idx = e.target.dataset['idx'];
            let list = this.data.playList || [];
            // 已经是第一个不用动
            if (idx <= 0) {
                return;
            }
            let midx = idx++;
            // 互换位置 [1, 2, 3] -> [1, 1, 3] -> [2, 1, 3]
            list[idx] = list.splice(midx, 1, list[idx])[0];

            this.setData({
                'playList': list
            });

            this.triggerEvent('change', list);
        },
        toEditor: function (e) {
            let idx = e.target.dataset['idx'];
            wx.navigateTo({
                url: 'component/wave-editor?waveId=' + this.data.playList[idx].id,
            })
        },
        toDelete(e) {
            let idx = e.target.dataset['idx'];
            let list = this.data.playList || [];
            list.splice(idx, 1);

            this.setData({
                'playList': list
            });
            this.triggerEvent('change', list);
        },
        clickItem(e) {
            console.log("clickItem");
            let idx = e.target.dataset['idx'];
            let list = this.data.playList || [];
            let wave = list[idx];
            if (wave) {
                let data = {
                    index: idx,
                    channel: this.data.channel,
                    wave
                };
                this.triggerEvent('waveclick', data);
            }
        }
    }
})