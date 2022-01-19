// index/wave.js
function ab2hex(buffer) {
    var hexArr = Array.prototype.map.call(new Uint8Array(buffer), function (bit) {
        return ('00' + bit.toString(16)).slice(-2);
    });
    return hexArr.join('');
}
var pwServiceId = "955A180A-0FE2-F5AA-A094-84B8D4F3E8AD",
    abServiceId = "955A180B-0FE2-F5AA-A094-84B8D4F3E8AD",
    abPWChId = "955A1504-0FE2-F5AA-A094-84B8D4F3E8AD",
    pwChId = "955A1500-0FE2-F5AA-A094-84B8D4F3E8AD",
    aChId = "955A1505-0FE2-F5AA-A094-84B8D4F3E8AD",
    bChId = "955A1506-0FE2-F5AA-A094-84B8D4F3E8AD";
Page({
    /**
     * 页面的初始数据
     */
    data: {
        device: {},
        mySong: [
            [1, 9, 4],
            [1, 9, 8],
            [1, 9, 12],
            [1, 9, 16],
            [1, 9, 18],
            [1, 9, 19],
            [1, 9, 20],
            [1, 9, 0],
            [1, 9, 0],
            [1, 9, 0]
        ],
        pw: 0,
        hz: 0,
        apw: 0,
        bpw: 0,
        z: 0
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        var ds = JSON.parse(options.device);
        this.setData({
            device: ds
        });
        const deviceId = ds.deviceId
        wx.createBLEConnection({
            deviceId,
            success: (res) => {
                this.setData({
                    connected: true
                })
                wx.onBLECharacteristicValueChange((characteristic) => {
                    switch (characteristic.characteristicId) {
                        case pwChId:
                            let pw = parseInt(ab2hex(characteristic.value), 16);
                            this.setData({
                                pw: pw
                            });
                            break;
                        case abPWChId:
                            let abPw = this.getAbPw(this.getRecBuffer(characteristic.value));
                            this.setData({
                                apw: abPw[0],
                                bpw: abPw[1]
                            });
                            break;
                    }
                })
                //监听电池电量
                wx.notifyBLECharacteristicValueChange({
                    deviceId,
                    serviceId: pwServiceId,
                    characteristicId: pwChId,
                    state: true,
                })
                // 监听AB电源强度
                // wx.notifyBLECharacteristicValueChange({
                //     deviceId,
                //     serviceId: abServiceId,
                //     characteristicId: abPWChId,
                //     state: true,
                // })
                // 读取电源电量
                wx.readBLECharacteristicValue({
                    deviceId,
                    serviceId: pwServiceId,
                    characteristicId: pwChId,
                })
                // 读取AB通道强度
                // wx.readBLECharacteristicValue({
                //     deviceId,
                //     serviceId: abServiceId,
                //     characteristicId: abPWChId,
                // })
            }
        })
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
        this.closeBLEConnection();
    },
    closeBLEConnection() {
        if(this.diyADg) clearInterval(this.diyADg);
        if(this.diyBDg) clearInterval(this.diyBDg);
        // 设置电源=0
        this.setData({
            apw: 0,
            bpw: 0
        });
        this.sendAbPwChange2BLE();
        wx.closeBLEConnection({
            deviceId: this.data.device.deviceId
        })
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
    getAbPw(str) {
        let ts = str.substring(2);
        let aspw = [];
        if (ts.length == 22) {
            aspw[1] = parseInt(ts.substring(0, 12), 2);
            aspw[0] = parseInt(ts.substring(12), 2);
        }
        return aspw;
    },
    getBinaryStr(str) {
        while (str.length < 8) {
            str = str + '0';
        }
        return str;
    },
    getRecBuffer(buf) {
        const dataView = new DataView(buf);
        let arr = new Array();
        arr[2] = this.getBinaryStr((dataView.getUint8(0)).toString(2));
        arr[1] = this.getBinaryStr((dataView.getUint8(1)).toString(2));
        arr[0] = this.getBinaryStr((dataView.getUint8(2)).toString(2));
        return arr.join('');
    },
    getSendBuffer(str) {
        let bArr = new ArrayBuffer(3);
        let dataView = new DataView(bArr);
        let arr = new Array();
        for (var i = 0; i < 3; i++) {
            var i2 = i * 8;
            let tempStr = Object.assign(str);
            if (i == 0) {
                arr[2] = this.getBytes(tempStr.substring(i2, i2 + 8));
            } else if (i == 2) {
                arr[0] = this.getBytes(tempStr.substring(i2, i2 + 8));
            } else {
                arr[i] = this.getBytes(tempStr.substring(i2, i2 + 8));
            }
        }
        dataView.setUint8(0, arr[0]);
        dataView.setUint8(1, arr[1]);
        dataView.setUint8(2, arr[2]);
        return bArr;
    },
    getBytes(str) {
        if (str == null) {
            throw new Error("when bit string convert to byte, Object can not be null!")
        } else if (8 != str.length) {
            throw new Error("bit string'length must be 8");
        } else {
            try {
                if (str.charAt(0) == '0') {
                    return parseInt(str, 2);
                }
                if (str.charAt(0) == '1') {
                    return parseInt(str, 2) - 256;
                }
                return 0;
            } catch (err) {
                throw new Error("bit string convert to byte failed, byte String must only include 0 and 1!");
            }
        }
    },
    subAp() {
        let ap = this.data.apw - 1;
        if (ap < 0) ap = 0;
        this.setData({
            apw: ap
        });
        this.sendAbPwChange2BLE();
    },
    subLongAp() {
        this.subLongApInv = setInterval(() => {
            this.subAp();
        }, 100);
    },
    endSubLongAp() {
        clearInterval(this.subLongApInv);
        this.subLongApInv = null;
    },
    addAp() {
        let ap = this.data.apw + 1;
        if (ap > 2047) ap = 2047;
        this.setData({
            apw: ap
        });
        this.sendAbPwChange2BLE();
    },
    addLongAp() {
        this.addLongApInv = setInterval(() => {
            this.addAp();
        }, 100);
    },
    endLongAp() {
        clearInterval(this.addLongApInv);
        this.addLongApInv = null;
    },
    apChange(e) {
        let ap = e.detail.value;
        this.setData({
            apw: ap
        });
        this.sendAbPwChange2BLE();
    },
    sendAbPwChange2BLE() {
        // 获取双通道的电量
        let abPw = this.getPwBinaryString(this.data.apw, this.data.bpw);
        //let abPw = '000000000000000011010010';
        let buf = this.getSendBuffer(abPw);
        console.log("set power a = %s b = %s", this.data.apw, this.data.bpw);
        // 发送数据
        wx.writeBLECharacteristicValue({
            deviceId: this.data.device.deviceId,
            serviceId: abServiceId,
            characteristicId: abPWChId,
            value: buf,
        })
    },
    getPwBinaryString(apw, bpw) {
        let astr = apw.toString(2);
        let bstr = bpw.toString(2);
        while (astr.length < 11) {
            astr = "0" + astr;
        }
        while (bstr.length < 11) {
            bstr = "0" + bstr;
        }
        return "00" + bstr + astr;
    },
    getWaveBinaryString(hz, z) {

        let frequency = Math.pow(10.0, hz / 1000);

        let pow = Math.pow(frequency / 1000, 0.5) * 15;
        let x = pow;
        if (pow < 1) {
            x = 1;
        } else {
            x = Math.round(x);
            if (x > 31) {
                x = 31;
            }
        }
        let y = frequency - x;
        y = Math.round(y);
        if (y > 1023) {
            y = 1023;
        }
        console.log('x = %s y = %s z = %s', x, y, z);
        let binaryString = x.toString(2);
        let binaryString2 = y.toString(2);
        let binaryString3 = z.toString(2);
        while (binaryString.length < 5) {
            binaryString = "0" + binaryString;
        }
        while (binaryString2.length < 10) {
            binaryString2 = "0" + binaryString2;
        }
        while (binaryString3.length < 5) {
            binaryString3 = "0" + binaryString3;
        }
        return "0000" + binaryString3 + binaryString2 + binaryString;
    },
    bpChange(e) {
        let bp = e.detail.value;
        this.setData({
            bpw: bp
        });
        // 获取双通道的电量
        let abPw = this.getPwBinaryString(this.data.apw, this.data.bpw);
        //let abPw = '000000000000000011010010';
        let buf = this.getSendBuffer(abPw);
        // 发送数据
        wx.writeBLECharacteristicValue({
            deviceId: this.data.device.deviceId,
            serviceId: abServiceId,
            characteristicId: abPWChId,
            value: buf,
        })
    },
    subHz() {
        let ap = this.data.hz - 1;
        if (ap < 0) ap = 0;
        this.setData({
            hz: ap
        });
        this.sendWave2BLE();
    },
    subLongHz() {
        this.subLongHzInv = setInterval(() => {
            this.subHz();
        }, 100);
    },
    endSubLongHz() {
        clearInterval(this.subLongHzInv);
        this.subLongHzInv = null;
    },
    addHz() {
        let ap = this.data.hz + 1;
        if (ap > 4272) ap = 4272;
        this.setData({
            hz: ap
        });
        this.sendWave2BLE();
    },
    addLongHz() {
        this.addLongHzInv = setInterval(() => {
            this.addHz();
        }, 10);
    },
    endLongHz() {
        clearInterval(this.addLongHzInv);
        this.addLongHzInv = null;
    },
    hzChange(e) {
        let hz = e.detail.value;
        this.setData({
            hz: hz
        });
        this.sendWave2BLE();
    },
    sendWave2BLE() {
        if (this.diyADg) {
            // 获取双通道的电量
            let wave = this.getWaveBinaryString(this.data.hz, this.data.z);
            this.playA(null, wave, true);
        }
    },
    zChange(e) {
        let z = e.detail.value;
        this.setData({
            z: z
        });
        this.sendWave2BLE();
    },
    playA(e, wave, append) {

        if (this.diyADg) {
            clearInterval(this.diyADg);
            this.diyADg = null;
            if (!append) {
                return;
            }
        }
        if (!wave) {
            // 获取双通道的电量
            wave = this.getWaveBinaryString(this.data.hz, this.data.z);
            //let abPw = '000000000000000011010010';

        }
        let buf = this.getSendBuffer(wave);
        let deviceId = this.data.device.deviceId;
        this.diyADg = setInterval(function () {
            console.log("writeBLECharacteristicValue a wave = %s", wave);
            // console.log("writeBLECharacteristicValue deviceId=%s serviceId=%s characteristicId=%s", dId, aServiceId, aChId)
            wx.writeBLECharacteristicValue({
                deviceId: deviceId,
                serviceId: abServiceId,
                characteristicId: aChId,
                value: buf,
            })
        }, 100);
    },
    playSong() {
        if (this.data.mySong.length <= 0) {
            return;
        }
        let maxIndex = this.data.mySong.length - 1;
        if (this.diyADg) {
            clearInterval(this.diyADg);
            this.diyADg = null;
        } else {
            let index = 0;
            let that = this;
            let songArray = this.data.mySong;
            // 设置电源=0
            this.setData({
                apw: 130,
                bpw: 0
            });
            this.sendAbPwChange2BLE();
            this.diyADg = setInterval(function () {
                if (index > maxIndex) {
                    index = 0;
                }
                let song = songArray[index];
                console.log('x = %s y = %s z = %s', song[0], song[1], song[2]);
                let wave = that.diyWaveGroup(song[0], song[1], song[2]);
                let buf = that.getSendBuffer(wave);
                console.log("writeBLECharacteristicValue song wave = %s", wave);
                wx.writeBLECharacteristicValue({
                    deviceId: that.data.device.deviceId,
                    serviceId: abServiceId,
                    characteristicId: aChId,
                    value: buf,
                })
                index++;
            }, 100);
        }
    },
    waveSongChange(e) {
        let song = e.detail.value;
        if (!song) {
            this.setData({
                mySong: []
            });
            return;
        }
        try {
            let songArray = JSON.parse(song);
            this.setData({
                mySong: songArray
            });
        } catch (err) {
            wx.showToast({
                title: '您的数据有误，请重新输入',
                icon: 'error',
                duration: 2000
            })
        }
    },
    diyWaveGroup(x, y, z) {
        var binaryString = x.toString(2);
        var binaryString2 = y.toString(2);
        var binaryString3 = z.toString(2);

        while (binaryString.length < 5) {
            binaryString = "0" + binaryString;
        }

        while (binaryString2.length < 10) {
            binaryString2 = "0" + binaryString2;
        }

        while (binaryString3.length < 5) {
            binaryString3 = "0" + binaryString3;
        }

        return "0000" + binaryString3 + binaryString2 + binaryString;
    },
})