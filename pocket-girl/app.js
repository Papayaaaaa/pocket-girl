// app.js
App({
  onLaunch() {
    // 初始化本地存储
    const records = wx.getStorageSync('records') || [];
    wx.setStorageSync('records', records);
  },
  
  globalData: {
    userInfo: null
  }
})
