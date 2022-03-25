// index/wave.js
import Dialog from '@vant/weapp/dialog/dialog';
import tools from '../lib/tools';
import Device from '../lib/device';

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
    let d = Device;
    getApp().blDevice = d;
    this._device = d;
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

    // d.setPw({
    //   a: 2,
    //   b: 0
    // });
    // console.log(d.getPw());
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
    if (this._device) {
      this._device.disConnection();
    }
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
    // 如果状态是已连接就跳过
    if (this.data.connState == '1') {
      // 停止搜索
      this._device.stopDiscovery();
      this.setData({
        'connState': '1'
      })
      return;
    }
    let msg = null;
    // 如果正在搜索就跳过
    if (this._device.isDiscoveryStarted()) {
      return;
    }
    // 改变蓝牙状态为正在连接
    this.setData({
      'connState': '0'
    });
    let sr = await this._device.startDiscovery();
    if (sr === true) {
      let cs = await this._device.getConnection();
      if (cs === true) {
        // 改变蓝牙状态为正在连接
        this.setData({
          'connState': '1'
        });
      } else {
        msg = cs;
      }
    } else {
      msg = sr;
    }
    if (msg) {
      // 改变蓝牙状态为搜索结束 没有发现设备
      this.setData({
        'connState': '2',
        'connStateMsg': res
      });
    }
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
  pwChange(e) {
    // 电影强度变更
    let pwObj = e.detail;
    let data = {};
    data['pw.' + pwObj.channel] = pwObj.pw;
    this.setData(data);
    this._device.setPw(this.data.pw);
  },
  pwChanged(channel, pw){
    let data = {};
    data['pw.' + channell] = pw;
    this.setData(data);
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
  // sendWaveData(e){
  //   this._device.sendWaveData(e);
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

})