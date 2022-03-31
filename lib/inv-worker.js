import './lodash-init';
import _ from "lodash";
module.exports = function (options) {
    let invWorker = Object.assign({
        invCnt: 0, // 执行次数
        invTime: 100, // 间隔毫秒数
        invId: null, // 计时器id
        invFunc: null, // 计时器处理函数
        cleFunc: null, // 计时器关闭函数
        cleFuncContext: null, // 计时器关闭函数上下文
        isRunning: false, // 是否正在执行
        invParam: {}, // 计时器执行参数
        setInvFunc: function (func) {
            if (func) {
                this.invFunc = func;
            }
        },
        setCleFunc: function (func, context) {
            if (func) {
                this.cleFunc = func;
                this.cleFuncContext = context;
            }
        },
        setInvParam: function (param) {
            this.invParam = param;
        },
        getInvParam: function () {
            return this.invParam;
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
                        this.invCnt++;
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
            this.invCnt = 0;
            if (this.cleFunc) {
                let con = this;
                if (this.cleFuncContext) {
                    con = this.cleFuncContext;
                }
                this.cleFunc.call(con, this);
            }
        }
    }, options || {});
    return invWorker;
}