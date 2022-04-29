import './lodash-init';
import _ from "lodash";
module.exports = function (options) {
    let state = Object.assign({
        a: false, // A状态-是否正在播放
        b: false, // B状态-是否正在播放
        mainChannel: null, // 主通道
        otherChannel: null, // 另一条通道
        setMainChannel: function (channel) {
            this.mainChannel = channel;
        },
        getMainChannel: function () {
            return this.mainChannel;
        },
        setOtherChannel: function (channel) {
            this.otherChannel = channel;
        },
        getOtherChannel: function () {
            return this.otherChannel;
        },
        isRunning: function () {
            return this.a || this.b;
        },
        setState: function (channel, state) {
            this[channel] = state;
        },
    }, options || {});
    return state;
}