// detail.js
Page({
  data: {
    record: {},
    id: ''
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id })
      this.loadRecord(options.id)
    }
  },

  loadRecord(id) {
    const records = wx.getStorageSync('records') || []
    const record = records.find(r => r.id === id)
    
    if (record) {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const deadline = new Date(record.tailDeadline)
      const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24))
      
      const categoryMap = {
        'guzi': '谷子',
        'hanfu': '汉服',
        'lo': 'Lo裙',
        'other': '其他'
      }
      
      this.setData({
        record: {
          ...record,
          categoryText: categoryMap[record.category] || '其他',
          daysLeft: daysLeft,
          isOverdue: !record.isPaid && daysLeft < 0,
          paidAtText: record.paidAt ? this.formatDate(record.paidAt) : ''
        }
      })
    }
  },

  formatDate(timestamp) {
    const date = new Date(timestamp)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  },

  togglePaid() {
    const records = wx.getStorageSync('records') || []
    const index = records.findIndex(r => r.id === this.data.id)
    
    if (index !== -1) {
      const isPaid = !records[index].isPaid
      records[index].isPaid = isPaid
      
      if (isPaid) {
        records[index].paidAt = Date.now()
      } else {
        delete records[index].paidAt
      }
      
      records[index].updatedAt = Date.now()
      wx.setStorageSync('records', records)
      
      this.loadRecord(this.data.id)
      
      wx.showToast({
        title: isPaid ? '已标记为已支付' : '已标记为未支付',
        icon: 'success'
      })
    }
  },

  // 快捷支付
  quickPay() {
    if (this.data.record.isPaid) return
    
    const records = wx.getStorageSync('records') || []
    const index = records.findIndex(r => r.id === this.data.id)
    
    if (index !== -1) {
      records[index].isPaid = true
      records[index].paidAt = Date.now()
      records[index].updatedAt = Date.now()
      wx.setStorageSync('records', records)
      
      this.loadRecord(this.data.id)
      
      wx.showToast({
        title: '支付成功！',
        icon: 'success'
      })
    }
  },

  editRecord() {
    wx.navigateTo({
      url: `/pages/add/add?id=${this.data.id}`
    })
  },

  deleteRecord() {
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这条记录吗？',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          const records = wx.getStorageSync('records') || []
          const filtered = records.filter(r => r.id !== this.data.id)
          wx.setStorageSync('records', filtered)
          
          wx.showToast({
            title: '已删除',
            icon: 'success'
          })
          
          setTimeout(() => {
            wx.navigateBack()
          }, 1500)
        }
      }
    })
  },

  previewImage(e) {
    const index = e.currentTarget.dataset.index
    wx.previewImage({
      current: this.data.record.images[index],
      urls: this.data.record.images
    })
  },

  // 分享
  onShareAppMessage() {
    return {
      title: `${this.data.record.name} - 尾款助手`,
      path: `/pages/detail/detail?id=${this.data.id}`
    }
  }
})
