import './lodash-init';
import _ from "lodash";
module.exports = function (options) {
    let invWorker = Object.assign({
        invTime: 100, // 间隔毫秒数
        invId: null, // 计时器id
        invFunc: null, // 计时器处理函数
        cleFunc: null, // 计时器关闭函数
        isRunning: false, // 是否正在执行
        invParam: {}, // 计时器执行参数
        setInvFunc: function (func) {
            if (func) {
                this.invFunc = func;
            }
        },
        setCleFunc: function (func) {
            if (func) {
                this.cleFunc = func;
            }
        },
        setInvParam: function (param) {
            this.invParam = param;
        },
        setInvParam: function (val) {
            this.invParam = val;
        },
        run: function () {
            if (this.invId) {
                return;
            }
            if (this.invFunc) {
                this.isRunning = true;
                let that = this;
                try {
                    this.invId = setInterval(() => {
                        that.invFunc(this.invParam);
                    }, this.invTime);
                } catch (e) {
                    console.error(e);
                    this.clean();
                }
            }
        },
        clean: function () {
            if (!this.invId) {
                return;
            }
            this.isRunning = false;
            clearInterval(this.invId);
            this.invId = null;
            this.invParam = {};
            if (this.cleFunc) {
                this.cleFunc.call(this);
            }
        }
    }, options || {});
    return invWorker;
}