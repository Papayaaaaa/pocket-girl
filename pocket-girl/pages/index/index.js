// index.js
const app = getApp()

Page({
  data: {
    records: [],
    filterType: 'all',
    filteredRecords: []
  },

  onShow() {
    this.loadRecords()
  },

  loadRecords() {
    const records = wx.getStorageSync('records') || []
    const processed = records.map(item => {
      const now = new Date()
      const deadline = new Date(item.tailDeadline)
      const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))
      
      const categoryMap = {
        'guzi': '谷子',
        'hanfu': '汉服',
        'lo': 'Lo裙',
        'other': '其他'
      }
      
      return {
        ...item,
        categoryText: categoryMap[item.category] || '其他',
        daysLeft: daysLeft
      }
    })
    
    // 按尾款时间排序（快到期的在前）
    processed.sort((a, b) => {
      if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1
      return a.daysLeft - b.daysLeft
    })
    
    this.setData({ records: processed })
    this.applyFilter()
  },

  setFilter(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ filterType: type })
    this.applyFilter()
  },

  applyFilter() {
    const { records, filterType } = this.data
    let filtered = records
    
    if (filterType === 'pending') {
      filtered = records.filter(r => !r.isPaid)
    } else if (filterType === 'paid') {
      filtered = records.filter(r => r.isPaid)
    }
    
    this.setData({ filteredRecords: filtered })
  },

  goToAdd() {
    wx.navigateTo({
      url: '/pages/add/add'
    })
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  },

  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    })
  }
})
