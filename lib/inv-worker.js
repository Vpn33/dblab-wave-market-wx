module.exports = function (options) {
    let invWorker = Object.assign({
        invTime: 100, // 间隔毫秒数
        invId: null, // 计时器id
        invFunc: null, // 计时器处理函数
        cleFunc: null, // 计时器关闭函数
        isRunning: false, // 是否正在执行
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
        run: function () {
            if (this.invId) {
                return;
            }
            if (this.invFunc) {
                this.isRunning = true;
                try {
                    this.invId = setInterval(this.invFunc, this.invTime);
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
            if (this.cleFunc) {
                this.cleFunc.call(this);
            }
        }
    }, options || {});
    return invWorker;
}