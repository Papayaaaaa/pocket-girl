// app.js
App({
  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        traceUser: true, // 自动获取当前环境
      })
    }
    
    // 初始化本地存储
    const records = wx.getStorageSync('records') || [];
    wx.setStorageSync('records', records);
  },
  
  globalData: {
    userInfo: null
  }
})
