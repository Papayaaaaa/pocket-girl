// settings.js
Page({
  data: {
    enableReminder: false,
    // 自定义提醒日期列表
    customRemindDays: [],
    // 预设选项
    remindDaysOptions: [1, 3, 7, 14, 21, 30],
    // 默认选择
    defaultRemindDays: [1, 3, 7],
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
      customRemindDays: settings.customRemindDays || [1, 3, 7],
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

  // 自定义提醒日期
  toggleRemindDay(e) {
    const day = e.currentTarget.dataset.day
    const days = [...this.data.customRemindDays]
    const index = days.indexOf(day)
    
    if (index > -1) {
      if (days.length > 1) { // 至少保留一个
        days.splice(index, 1)
      }
    } else {
      days.push(day)
    }
    
    days.sort((a, b) => a - b)
    this.setData({ customRemindDays: days })
    this.saveSettings()
  },

  // 绑定服务号
  bindServiceAccount() {
    wx.showLoading({ title: '绑定中...' })
    
    // 模拟绑定流程
    // 实际需要：
    // 1. 调用 wx.login 获取 code
    // 2. 发送到后端换取 OpenID
    // 3. 存储用户绑定关系
    
    setTimeout(() => {
      wx.hideLoading()
      
      // 实际应该是后端返回结果
      wx.showModal({
        title: '绑定服务号',
        content: '此功能需要配置微信服务号。请在微信公众平台配置模板消息后，再进行绑定。',
        confirmText: '知道了',
        showCancel: false
      })
      
      // 模拟绑定成功（测试用）
      // this.setData({ hasBind: true })
      // this.saveSettings()
      // wx.showToast({ title: '绑定成功', icon: 'success' })
    }, 1500)
  },

  // 测试推送
  testPush() {
    if (!this.data.enableReminder) {
      wx.showToast({ title: '请先开启提醒', icon: 'none' })
      return
    }

    wx.showLoading({ title: '发送中...' })
    
    wx.cloud.callFunction({
      name: 'sendReminder',
      data: {
        test: true,
        remindDays: this.data.customRemindDays
      },
      success: (res) => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          wx.showToast({ title: '发送成功', icon: 'success' })
        } else {
          wx.showToast({ title: res.result?.message || '发送失败', icon: 'none' })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        wx.showToast({ title: '发送失败', icon: 'none' })
        console.error('发送测试消息失败:', err)
      }
    })
  },

  // 数据管理
  exportData() {
    const records = wx.getStorageSync('records') || []
    const exportData = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      count: records.length,
      records: records
    }
    
    const jsonStr = JSON.stringify(exportData, null, 2)
    
    wx.downloadFile({
      url: 'data:text/json;charset=utf-8,' + encodeURIComponent(jsonStr),
      success: (res) => {
        wx.saveFile({
          tempFilePath: res.tempFilePath,
          success: () => {
            wx.showToast({ title: '导出成功', icon: 'success' })
          }
        })
      },
      fail: () => {
        // 备选方案：显示数据让用户复制
        wx.showModal({
          title: '导出数据',
          content: jsonStr,
          showCancel: false
        })
      }
    })
  },

  importData() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success: (res) => {
        const filePath = res.tempFiles[0].path
        
        wx.getFileSystemManager().readFile({
          filePath: filePath,
          success: (fileRes) => {
            try {
              const data = JSON.parse(new TextDecoder().decode(fileRes.data))
              
              if (data.records && Array.isArray(data.records)) {
                wx.showModal({
                  title: '导入确认',
                  content: `确定要导入 ${data.records.length} 条记录吗？\n这将覆盖现有数据！`,
                  confirmColor: '#07C160',
                  success: (modalRes) => {
                    if (modalRes.confirm) {
                      wx.setStorageSync('records', data.records)
                      wx.showToast({ title: '导入成功', icon: 'success' })
                    }
                  }
                })
              } else {
                wx.showToast({ title: '数据格式错误', icon: 'none' })
              }
            } catch (e) {
              wx.showToast({ title: '解析失败', icon: 'none' })
            }
          }
        })
      }
    })
  },

  // 清空数据
  clearAllData() {
    wx.showModal({
      title: '清空数据',
      content: '确定要清空所有记录吗？此操作不可恢复！',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync()
          wx.showToast({ title: '已清空', icon: 'success' })
        }
      }
    })
  },

  saveSettings() {
    const providerMap = { 0: 'moonshot', 1: 'openai', 2: 'anthropic' }
    const settings = {
      enableReminder: this.data.enableReminder,
      customRemindDays: this.data.customRemindDays,
      hasBind: this.data.hasBind,
      aiProvider: providerMap[this.data.aiProviderIndex],
      aiApiKey: this.data.aiApiKey
    }
    wx.setStorageSync('userSettings', settings)
  }
})
