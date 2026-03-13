// stats.js
Page({
  data: {
    currentPeriod: 'half', // 'half', 'month', 'year'
    periodLabel: '半月',
    stats: {
      pendingTail: 0,
      paidTotal: 0,
      total: 0,
      pendingCount: 0,
      paidCount: 0
    },
    categoryStats: [],
    upcomingRecords: []
  },

  onShow() {
    this.loadStats()
  },

  switchPeriod(e) {
    const period = e.currentTarget.dataset.period
    const labels = { half: '半月', month: '月度', year: '年度' }
    this.setData({
      currentPeriod: period,
      periodLabel: labels[period]
    })
    this.loadStats()
  },

  loadStats() {
    const records = wx.getStorageSync('records') || []
    const period = this.data.currentPeriod
    
    const now = new Date()
    let startDate, endDate
    
    if (period === 'half') {
      const day = now.getDate()
      if (day <= 15) {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 15)
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 16)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      }
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    } else {
      // 年度
      startDate = new Date(now.getFullYear(), 0, 1)
      endDate = new Date(now.getFullYear(), 11, 31)
    }
    
    // 筛选该周期的记录（按尾款截止日）
    const periodRecords = records.filter(r => {
      if (!r.tailDeadline) return false
      const deadline = new Date(r.tailDeadline)
      return deadline >= startDate && deadline <= endDate
    })
    
    // 计算该周期统计
    let pendingTail = 0
    let paidTotal = 0
    let pendingCount = 0
    let paidCount = 0
    
    periodRecords.forEach(r => {
      const amount = (r.tailPrice || 0) + (r.deposit || 0)
      if (r.isPaid) {
        paidTotal += amount
        paidCount++
      } else {
        pendingTail += amount
        pendingCount++
      }
    })

    // 分类统计
    const categoryMap = {
      'guzi': { name: '谷子', color: '#FF6B9D' },
      'hanfu': { name: '汉服', color: '#52C41A' },
      'lo': { name: 'Lo裙', color: '#FF9500' },
      'other': { name: '其他', color: '#999' }
    }
    
    const categoryAmounts = {}
    const categoryCounts = {}
    
    periodRecords.forEach(r => {
      const amount = (r.tailPrice || 0) + (r.deposit || 0)
      if (!categoryAmounts[r.category]) {
        categoryAmounts[r.category] = 0
        categoryCounts[r.category] = 0
      }
      categoryAmounts[r.category] += amount
      categoryCounts[r.category]++
    })
    
    const total = pendingTail + paidTotal
    const categoryStats = Object.entries(categoryAmounts)
      .map(([category, amount]) => ({
        category,
        name: categoryMap[category]?.name || '其他',
        color: categoryMap[category]?.color || '#999',
        amount: amount.toFixed(2),
        count: categoryCounts[category] || 0,
        percent: total > 0 ? (amount / total * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount)

    // 近期需要尾款的记录（未来30天内未完成）
    const thirtyDaysLater = new Date()
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    const upcomingRecords = records
      .filter(r => {
        if (r.isPaid || !r.tailDeadline) return false
        const deadline = new Date(r.tailDeadline)
        return deadline >= today && deadline <= thirtyDaysLater
      })
      .sort((a, b) => new Date(a.tailDeadline) - new Date(b.tailDeadline))
      .slice(0, 5)

    this.setData({
      stats: {
        pendingTail: pendingTail.toFixed(2),
        paidTotal: paidTotal.toFixed(2),
        total: (pendingTail + paidTotal).toFixed(2),
        pendingCount,
        paidCount
      },
      categoryStats,
      upcomingRecords
    })
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  }
})
