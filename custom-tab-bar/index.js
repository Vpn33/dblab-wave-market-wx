Component({
  data: {
    list: [{
      url: "/index/index",
      iconPrefix: "iconfont",
      icon: "dg-wolf",
      text: "设备"
    }, {
      url: "/index/my-wave-list",
      iconPrefix: "iconfont",
      icon: "waves",
      text: "我的波形"
    }, {
      url: "/index/market",
      icon: "shopping-cart",
      text: "市场"
    }, {
      url: "/index/my-home",
      icon: "setting-o",
      text: "设置"
    }],
    active: 0
  },
  attached() {},
  methods: {
    onChange(event) {
      this.setData({
        active: event.detail
      });
      wx.switchTab({
        url: this.data.list[event.detail].url
      });
    },

    init() {
      const page = getCurrentPages().pop();
      this.setData({
        active: this.data.list.findIndex(item => item.url === `/${page.route}`)
      });
    }
  }
})