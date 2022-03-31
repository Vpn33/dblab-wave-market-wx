// index/component/power-editor.js
import Toast from '@vant/weapp/toast/toast';
import moment from "moment";
import tools from '../../lib/tools';
import wa from "../../lib/wave-analyzer";
Component({
    /**
     * 组件的属性列表
     */
    properties: {
        powerId: {
            type: String,
            value: '',
        },
    },

    /**
     * 组件的初始数据
     */
    data: {
        power: { // 电源方案
            name: null, // 名称
            metas: [{
                z: 0
            }]
        },
    },
    lifetimes: {
        ready: function () {
            // 在组件实例进入页面节点树时执行
            let powerId = this.data.powerId;
            if (!powerId) {
                return;
            }
            // 加载电源方案
            this.readExistsPower(powerId);
        }
    },

    /**
     * 组件的方法列表
     */
    methods: {
        async readExistsPower(powerId) {
            let power = await wa.readPower(powerId);
            this.setData({
                power
            });
        },
        onChange(e) {
            this.setData({
                'power.name': e.detail
            });
        },
        addMeta(e) {
            let power = this.data.power;
            power.metas.push({
                z: 0
            });
            this.setData({
                power
            });
        },
        subMeta(e) {
            let power = this.data.power;
            if (power.metas.length == 1) {
                return;
            }
            power.metas.pop();
            this.setData({
                power
            });
        },
        subOneMeta(e) {
            let mIdx = e.target.dataset['metaIdx'];
            let power = this.data.power;
            power.metas.splice(mIdx, 1);
            this.setData({
                power
            });
        },
        onMetaZChange(e) {
            // 电源中的一个节点改变值
            let mIdx = e.target.dataset['metaIdx'];
            let data = {};
            // 因为van-silder的值上面是最小 下面是最大 和正常理解相反 所以需要取反
            let val = -e.detail.value || 0;

            data['power.metas[' + mIdx + '].z'] = val;
            this.setData(
                data
            );
            // console.log(this.data.wave.stages[idx].metas[mIdx]);
        },
        async savePower() {
            // 保存电源方案
            let power = Object.assign({}, this.data.power);
            if (!power.name) {
                Toast.fail("电源方案名称不能为空");
                return;
            }

            // id
            if (!power.id) {
                power.id = tools.uuid();
            }
            // 创建时间
            if (!power.createTime) {
                power.createTime = moment().format("YYYY-MM-DD HH:mm:ss")
            }
            // 写入文件
            let res = await wa.writePower(power);
            if (res) {
                Toast.success({
                    message: '保存成功'
                });
                setTimeout(() => {
                    // wx.switchTab({
                    //     url: '/index/my-power-list'
                    // });
                    // 返回上一页
                    wx.navigateBack();
                }, 500);
            }
        }
    }
})