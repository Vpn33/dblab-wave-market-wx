import './lodash-init';
import _ from "lodash";

module.exports = {
    isEmpty: function (arr) {
        return _.isEmpty(arr);
    },
    stringify: function (arr) {
        if (arr) {
            return JSON.stringify(arr);
        }
        return "";
    },
    abs: function (arr) {
        if (arr) {
            return Math.abs(arr);
        }
        return arr;
    },
    toFixed: function (arr, rat) {
        if (arr && typeof arr === 'number') {
            return arr.toFixed(rat);
        }
        return arr;
    },
    uuid: function () {
        var s = [];
        var hexDigits = "0123456789abcdef";
        for (var i = 0; i < 36; i++) {
            s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
        }
        s[14] = "4"; // bits 12-15 of the time_hi_and_version field to 0010
        s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1); // bits 6-7 of the clock_seq_hi_and_reserved to 01
        s[8] = s[13] = s[18] = s[23] = "-";
        var uuid = s.join("").replaceAll("-", "");
        return uuid;
    },
    // 字符串转二进制
    strToBinary: function (str) {
        if (!str) {
            return "";
        }
        var result = [];
        var list = str.split("");
        for (var i = 0; i < list.length; i++) {
            if (i != 0) {
                result.push(" ");
            }
            var item = list[i];
            var binaryStr = item.charCodeAt().toString(2);
            result.push(binaryStr);
        }
        return result.join("");
    },

    //将二进制字符串转换成Unicode字符串
    binaryToStr: function (str) {
        var result = [];
        var list = str.split(" ");
        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            var asciiCode = parseInt(item, 2);
            var charValue = String.fromCharCode(asciiCode);
            result.push(charValue);
        }
        return result.join("");
    }
}