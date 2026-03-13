// yearly.js
Page({
  data: {
    currentYear: 2026,
    years: [],
    stats: null,
    monthlyData: [],
    categoryStats: []
  },

  onLoad() {
    this.initYears()
    this.loadStats()
  },

  onShow() {
    this.loadStats()
  },

  initYears() {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let i = currentYear; i >= currentYear - 5; i--) {
      years.push(i)
    }
    this.setData({ 
      years,
      currentYear
    })
  },

  onYearChange(e) {
    const index = e.detail.value
    this.setData({ 
      currentYear: this.data.years[index]
    })
    this.loadStats()
  },

  loadStats() {
    const records = wx.getStorageSync('records') || []
    const year = this.data.currentYear
    
    // 年度统计
    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31)
    
    const yearRecords = records.filter(r => {
      if (!r.tailDeadline) return false
      const deadline = new Date(r.tailDeadline)
      return deadline >= yearStart && deadline <= yearEnd
    })
    
    // 按月统计
    const monthlyData = []
    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 0)
      
      const monthRecords = yearRecords.filter(r => {
        const deadline = new Date(r.tailDeadline)
        return deadline >= monthStart && deadline <= monthEnd
      })
      
      let paid = 0
      let pending = 0
      monthRecords.forEach(r => {
        const amount = (r.tailPrice || 0) + (r.deposit || 0)
        if (r.isPaid) {
          paid += amount
        } else {
          pending += amount
        }
      })
      
      monthlyData.push({
        month: month + 1,
        label: (month + 1) + '月',
        count: monthRecords.length,
        paid: paid.toFixed(2),
        pending: pending.toFixed(2),
        total: (paid + pending).toFixed(2)
      })
    }
    
    // 分类统计
    const categoryMap = {
      'guzi': { name: '谷子', color: '#FF6B9D' },
      'hanfu': { name: '汉服', color: '#52C41A' },
      'lo': { name: 'Lo裙', color: '#FF9500' },
      'other': { name: '其他', color: '#999' }
    }
    
    const categoryAmounts = {}
    const categoryCounts = {}
    yearRecords.forEach(r => {
      const amount = (r.tailPrice || 0) + (r.deposit || 0)
      if (!categoryAmounts[r.category]) {
        categoryAmounts[r.category] = 0
        categoryCounts[r.category] = 0
      }
      categoryAmounts[r.category] += amount
      categoryCounts[r.category]++
    })
    
    const total = Object.values(categoryAmounts).reduce((a, b) => a + b, 0)
    const categoryStats = Object.entries(categoryAmounts)
      .map(([category, amount]) => ({
        category,
        name: categoryMap[category]?.name || '其他',
        color: categoryMap[category]?.color || '#999',
        amount: amount.toFixed(2),
        count: categoryCounts[category] || 0,
        percent: total > 0 ? (amount / total * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.amount - a.amount)
    
    // 年度汇总
    let yearPaid = 0
    let yearPending = 0
    yearRecords.forEach(r => {
      const amount = (r.tailPrice || 0) + (r.deposit || 0)
      if (r.isPaid) {
        yearPaid += amount
      } else {
        yearPending += amount
      }
    })
    
    this.setData({
      stats: {
        totalRecords: yearRecords.length,
        paidAmount: yearPaid.toFixed(2),
        pendingAmount: yearPending.toFixed(2),
        totalAmount: (yearPaid + yearPending).toFixed(2)
      },
      monthlyData,
      categoryStats
    })
  },

  goToDetail(e) {
    const month = e.currentTarget.dataset.month
    wx.navigateTo({
      url: `/pages/monthly/monthly?year=${this.data.currentYear}&month=${month}`
    })
  }
})
