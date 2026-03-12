// settings.js
Page({
  data: {
    enableReminder: false,
    remindDaysOptions: [1, 3, 7, 14, 21, 30],
    remindDaysIndex: 1, // 默认提前2天
    hasBind: false,
    // AI 设置
    aiProviderOptions: ['Moonshot AI (月之暗面)', 'OpenAI GPT-4', 'Anthropic Claude'],
    aiProviderIndex: 0,
    aiApiKey: ''
  },

  onLoad() {
    this.loadSettings()
  },

  loadSettings() {
    const settings = wx.getStorageSync('userSettings') || {}
    const providerMap = { 'moonshot': 0, 'openai': 1, 'anthropic': 2 }
    this.setData({
      enableReminder: settings.enableReminder || false,
      remindDaysIndex: settings.remindDaysIndex || 1,
      hasBind: settings.hasBind || false,
      aiProviderIndex: providerMap[settings.aiProvider] || 0,
      aiApiKey: settings.aiApiKey || ''
    })
  },

  // AI 设置相关
  onAiProviderChange(e) {
    this.setData({ aiProviderIndex: e.detail.value })
    this.saveSettings()
  },

  onAiApiKeyInput(e) {
    this.setData({ aiApiKey: e.detail.value })
    this.saveSettings()
  },

  toggleReminder(e) {
    const enableReminder = e.detail.value
    this.setData({ enableReminder })
    this.saveSettings()
    
    if (enableReminder && !this.data.hasBind) {
      wx.showModal({
        title: '提示',
        content: '开启提醒需要先绑定服务号，是否现在绑定？',
        confirmColor: '#07C160',
        success: (res) => {
          if (res.confirm) {
            this.bindServiceAccount()
          } else {
            this.setData({ enableReminder: false })
            this.saveSettings()
          }
        }
      })
    }
  },

  onRemindDaysChange(e) {
    this.setData({
      remindDaysIndex: e.detail.value
    })
    this.saveSettings()
  },

  bindServiceAccount() {
    // 获取用户授权，获取 OpenID
    // 实际需要通过 wx.login 获取 code，然后换取 OpenID
    wx.showLoading({ title: '绑定中...' })
    
    // 模拟绑定成功
    setTimeout(() => {
      wx.hideLoading()
      this.setData({ hasBind: true })
      this.saveSettings()
      wx.showToast({
        title: '绑定成功',
        icon: 'success'
      })
    }, 1500)

    // 实际实现：
    // 1. 调用 wx.login 获取 code
    // 2. 发送到后端换取 OpenID
    // 3. 存储用户绑定关系
  },

  testPush() {
    if (!this.data.enableReminder) {
      wx.showToast({
        title: '请先开启提醒',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '发送中...' })
    
    // 调用云函数发送测试消息
    wx.cloud.callFunction({
      name: 'sendReminder',
      data: {
        test: true
      },
      success: (res) => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          wx.showToast({
            title: '发送成功',
            icon: 'success'
          })
        } else {
          wx.showToast({
            title: res.result?.message || '发送失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        wx.showToast({
          title: '发送失败',
          icon: 'none'
        })
        console.error('发送测试消息失败:', err)
      }
    })
  },

  saveSettings() {
    const providerMap = { 0: 'moonshot', 1: 'openai', 2: 'anthropic' }
    const settings = {
      enableReminder: this.data.enableReminder,
      remindDaysIndex: this.data.remindDaysIndex,
      hasBind: this.data.hasBind,
      aiProvider: providerMap[this.data.aiProviderIndex],
      aiApiKey: this.data.aiApiKey
    }
    wx.setStorageSync('userSettings', settings)
  }
})
