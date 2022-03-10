// index/wave.js
import Dialog from '@vant/weapp/dialog/dialog';
import tools from '../lib/tools';

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
  // options: {
  //     styleIsolation: 'shared'
  // },
  /**
   * 页面的初始数据
   */
  data: {
    isDebug: true, // 是否为测试模式
    connState: '-1', // -1-未授权 0-未连接 1-已连接 2-连接中 2-连接失败
    connStateMsg: '', // 连接错误消息
    activeNames: '1',
    aiAp: true,
    aiBp: true,
    device: null,
    // mySong: [
    //     [1, 9, 4],
    //     [1, 9, 8],
    //     [1, 9, 12],
    //     [1, 9, 16],
    //     [1, 9, 18],
    //     [1, 9, 19],
    //     [1, 9, 20],
    //     [1, 9, 0],
    //     [1, 9, 0],
    //     [1, 9, 0]
    // ],
    // mySong: [
    //     [5, 135, 20],
    //     [5, 125, 20],
    //     [5, 115, 20],
    //     [5, 105, 20],
    //     [5, 95, 20],
    //     [4, 86, 20],
    //     [4, 76, 20],
    //     [4, 66, 20],
    //     [3, 57, 20],
    //     [3, 47, 20],
    //     [3, 37, 20],
    //     [2, 28, 20],
    //     [2, 18, 20],
    //     [1, 14, 20],
    //     [1, 9, 20]
    // ],
    // mySong: [[5,95,20],[5,95,20],[5,95,20],[5,95,20],[5,95,20],[1,9,20],[1,9,20],[1,9,20],[1,9,20],[1,9,20]],
    battery: 0,
    pw: {
      a: 0,
      b: 0
    },
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // wx.getSystemInfo({
    //   success(res) {
    //     console.log(res)
    //   }
    // })
  },
  onShow: function () {
    // 页面出现在前台时执行
    let bar = this.getTabBar();
    if (typeof this.getTabBar === 'function' && bar) {
      bar.init();
      // 如果是debug就直接跳过 不显示连接蓝牙的遮罩
      if (this.data.isDebug) {
        this.setData({
          connState: 1
        });
        return;
      }
      // 打开蓝牙连接
      this.getConnection();
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

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
    this.closeBluetoothAdapter();
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
  checkAuth() {
    let that = this;
    // 可以通过 wx.getSetting 先查询一下用户是否授权了 "scope.record" 这个 scope
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success(res) {
          if (!res.authSetting['scope.bluetooth']) {
            wx.authorize({
              scope: 'scope.bluetooth',
              success() {
                resolve(true);
              },
              fail(err) {
                console.error(err)
                // 未授权了就进入未授权状态
                that.setData({
                  'connState': '-1'
                });
                reject(err);
              }
            });
          } else {
            resolve(true);
          }
        }
      });
    }).catch(e => {
      return false;
    });

  },
  openSetting() {
    wx.openSetting({
      success(res) {}
    })
  },
  async getConnection() {
    let res = await this.checkAuth();
    if (!res) {
      return;
    }
    // 如果正在搜索就跳过
    if (this._discoveryStarted) {
      return
    }
    // 改变蓝牙状态为正在连接
    this.setData({
      'connState': '0'
    });
    // 打开蓝牙适配器
    wx.openBluetoothAdapter({
      success: (res) => {
        // 搜索蓝牙设备
        this.startBluetoothDevicesDiscovery();
        // 30秒后关闭搜索
        let that = this;
        setTimeout(() => {
          that.stopBluetoothDevicesDiscovery();
          // 如果没有设备 说明没有找到
          if (!that.device) {
            // 改变蓝牙状态为搜索结束 没有发现设备
            this.setData({
              'connState': '2',
              'connStateMsg': '没有发现设备'
            });
          }
        }, 30000);
      },
      fail: (res) => {
        let msg = this.getBluetoothAdapterMsg(res);
        if (!msg) {
          msg = res.errMsg;
        }
        // 如果是设备不可用 可能是被系统禁止了 注册一个状态监听器 一旦恢复 可以继续搜索
        if (res.errCode === 10001) {
          wx.onBluetoothAdapterStateChange(function (res) {
            // 设备可用
            if (res.available) {
              // 搜索蓝牙设备
              this.startBluetoothDevicesDiscovery()
            }
          })
        }
        // 设置错误消息
        if (msg) {
          // 连接失败
          this.setData({
            'connState': '2',
            'connStateMsg': msg
          })
        }
      }
    })
  },
  closeBluetoothAdapter() {
    wx.closeBluetoothAdapter();
    this._discoveryStarted = false;
    this.setData({
      'connState': '-1'
    });
  },
  getBluetoothAdapterMsg(res) {
    // 解析蓝牙适配器消息
    let msg = null;
    switch (res.errCode) {
      case 10000:
        msg = '未初始化蓝牙适配器';
        break;
      case 10001:
        msg = '当前蓝牙适配器不可用';
        break;
      case 10002:
        msg = '没有找到指定设备';
        break;
      case 10003:
        msg = '连接失败';
        break;
      case 10004:
        msg = '没有找到指定服务';
        break;
      case 10005:
        msg = '没有找到指定特征';
        break;
      case 10006:
        msg = '当前连接已断开';
        break;
      case 10007:
        msg = '当前特征不支持此操作';
        break;
      case 10008: // 其余所有系统上报的异常
        msg = '蓝牙设备异常';
        break;
      case 10009: // Android 系统特有，系统版本低于 4.3 不支持 BLE
        msg = '您的系统版本过低，不支持BLE设备';
        break;
      case 10012:
        msg = '连接超时';
        break;
      case 10013:
        msg = '连接 deviceId 为空或者是格式不正确';
        break;
    }
    return msg;
  },
  startBluetoothDevicesDiscovery() {
    // 搜索蓝牙设备
    // 如果正在搜索就跳过
    if (this._discoveryStarted) {
      return
    }
    this._discoveryStarted = true
    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: true, // 允许重复key
      success: (res) => {
        // 开启发现蓝牙设备
        this.onBluetoothDeviceFound();
      },
    })
  },
  stopBluetoothDevicesDiscovery() {
    // 关闭蓝牙搜索
    wx.stopBluetoothDevicesDiscovery()
  },
  onBluetoothDeviceFound() {
    wx.onBluetoothDeviceFound((res) => {
      res.devices.forEach(device => {
        if (!device.name && !device.localName) {
          return;
        }
        // 过滤DG的设备 其他的蓝牙设备不需要
        if (device.name.toUpperCase().indexOf('D-LAB ESTIM') < 0) {
          return;
        }
        // 只要找到一个 就添加到设备 停止发现并连接
        this.setData({
          device
        });
        // 停止搜索
        this.stopBluetoothDevicesDiscovery();
        // 创建BLE连接
        this.createBLECOnnection(device.deviceId);
      });
    });
  },
  onChange(event) {
    this.setData({
      activeNames: event.detail,
    });
  },
  onAiAPChange(e) {
    let data = {
      aiAp: e.detail
    };
    this.setData(data);
  },
  showAiPwHelp() {
    Dialog.alert({
      message: '开启后会自动记录在播放某个波形时的电源强度，下次播放时，如果电源强度大于记录的强度，就会自动减小到已记录的强度，当波形结束播放后，电源强度恢复。' +
        '更智能的避免波形切换时带来的冲击感。(例如：A波-可承受电源130强度 B波-可承受电源100强度 如果按照APP的功能，从 A -> B 时因为强度没变，就会产生强烈的刺痛感，需要手动调节强度,' +
        '开启本功能后，就会主键避免这种问题，越使用就越精确)',
    });
  },
  toggleAWaveCharts() {
    this.data.showAWaveCharts = !this.data.showAWaveCharts;
    if (!this.data.showAWaveCharts) {
      this.clearCharts();
    }
    this.setData({
      showAWaveCharts: this.data.showAWaveCharts
    });
  },

  createBLECOnnection(deviceId) {
    wx.createBLEConnection({
      deviceId,
      success: (res) => {
        // 连接成功 改变状态
        this.setData({
          'connState': '1'
        })
        // 注册设备监听
        wx.onBLECharacteristicValueChange((characteristic) => {
          switch (characteristic.characteristicId) {
            // 电池电量
            case pwChId:
              let battery = parseInt(ab2hex(characteristic.value), 16);
              this.setData({
                battery
              });
              break;
            case abPWChId:
              // AB电源强度
              let abPw = this.getAbPw(this.getRecBuffer(characteristic.value));
              let data = {};
              data.pw.a = abPw[0] || 0;
              data.pw.b = abPw[1] || 0;
              this.setData(data);
              break;
          }
        })
        //监听电池电量
        wx.notifyBLECharacteristicValueChange({
          deviceId,
          serviceId: pwServiceId,
          characteristicId: pwChId,
          state: true,
        });
        // 监听AB电源强度
        wx.notifyBLECharacteristicValueChange({
          deviceId,
          serviceId: abServiceId,
          characteristicId: abPWChId,
          state: true,
        });
        // 读取电源电量
        wx.readBLECharacteristicValue({
          deviceId,
          serviceId: pwServiceId,
          characteristicId: pwChId,
        })
        // 读取AB通道强度
        wx.readBLECharacteristicValue({
          deviceId,
          serviceId: abServiceId,
          characteristicId: abPWChId,
        })
      }
    })
  },

  closeBLEConnection() {
    if (this.diyADg) clearInterval(this.diyADg);
    if (this.diyBDg) clearInterval(this.diyBDg);
    // 设置电源=0
    let data = {
      pw: {
        a: 0,
        b: 0
      }
    };
    this.setData(data);
    this.sendAbPwChange2BLE();
    wx.closeBLEConnection({
      deviceId: this.data.device.deviceId
    })
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
  pwChange(e) {
    let pwObj = e.detail;
    let data = {};
    data['pw.' + pwObj.channel] = pwObj.pw;
    this.setData(data);
    this.sendAbPwChange2BLE();
  },
  sendAbPwChange2BLE() {
    // 获取双通道的电量
    let abPw = this.getPwBinaryString(this.data.pw.a, this.data.pw.b);
    //let abPw = '000000000000000011010010';
    let buf = this.getSendBuffer(abPw);
    console.log("set power a = %s b = %s", this.data.pw.a, this.data.pw.b);
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
  // playA(e, wave, append) {

  //   if (this.diyADg) {
  //     clearInterval(this.diyADg);
  //     this.diyADg = null;
  //     if (!append) {
  //       return;
  //     }
  //   }
  //   if (!wave) {
  //     // 获取双通道的电量
  //     wave = this.getWaveBinaryString(this.data.hz, this.data.z);
  //     //let abPw = '000000000000000011010010';

  //   }
  //   let buf = this.getSendBuffer(wave);
  //   let deviceId = this.data.device.deviceId;
  //   this.diyADg = setInterval(function () {
  //     console.log("writeBLECharacteristicValue a wave = %s", wave);
  //     // console.log("writeBLECharacteristicValue deviceId=%s serviceId=%s characteristicId=%s", dId, aServiceId, aChId)
  //     wx.writeBLECharacteristicValue({
  //       deviceId: deviceId,
  //       serviceId: abServiceId,
  //       characteristicId: aChId,
  //       value: buf,
  //     })
  //   }, 100);
  // },

  // playSong() {
  //   if (this.data.mySong.length <= 0) {
  //     return;
  //   }
  //   let that = this;
  //   let maxIndex = this.data.mySong.length - 1;
  //   if (this.diyADg) {
  //     clearInterval(this.diyADg);
  //     this.diyADg = null;
  //     this.clearCharts();
  //   } else {
  //     let index = 0;
  //     let that = this;
  //     let songArray = this.data.mySong;
  //     // 设置电源=0
  //     this.setData({
  //       apw: 130,
  //       bpw: 0
  //     });
  //     this.sendAbPwChange2BLE();
  //     this.diyADg = setInterval(function () {
  //       if (index > maxIndex) {
  //         index = 0;
  //       }
  //       let song = songArray[index];
  //       console.log('x = %s y = %s z = %s', song[0], song[1], song[2]);
  //       that.writeCharts(song[1], song[2], new Date().getTime());
  //       let wave = that.diyWaveGroup(song[0], song[1], song[2]);
  //       let buf = that.getSendBuffer(wave);
  //       console.log("writeBLECharacteristicValue song wave = %s", wave);
  //       wx.writeBLECharacteristicValue({
  //         deviceId: that.data.device.deviceId,
  //         serviceId: abServiceId,
  //         characteristicId: aChId,
  //         value: buf,
  //       })
  //       index++;
  //     }, 100);
  //   }
  // },
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
  onInstance({
    detail: instance
  }) {
    this.waveChartCmp = instance;
  },
  sendWaveData(e) {

    let data = e.detail;
    // 如果没有二进制数据 说明不正确
    if (!(data.song && data.song.arrBuffer)) {
      return;
    }
    // 如果没有通道数据 也不正确
    if (!data.channel) {
      return;
    }
    // 播放列表修改要存储
    let cha = data.channel;
    // 默认A通道特性UUID
    let chid = aChId;
    // 设置B通道特性UUID
    if (cha === 'b') {
      chid = bChId;
    }
    console.log("sendWaveData=", e);
    wx.writeBLECharacteristicValue({
      deviceId: this.data.device.deviceId,
      serviceId: abServiceId,
      characteristicId: chid,
      value: data.song.arrBuffer,
    });

  },

})