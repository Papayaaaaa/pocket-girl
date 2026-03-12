// stats.js
Page({
  data: {
    currentPeriod: 'half', // 'half' or 'month'
    periodLabel: '半月',
    stats: {
      pendingTail: 0,
      paidTotal: 0,
      total: 0
    },
    categoryStats: [],
    upcomingRecords: []
  },

  onShow() {
    this.loadStats()
  },

  switchPeriod(e) {
    const period = e.currentTarget.dataset.period
    const labels = { half: '半月', month: '月度' }
    this.setData({
      currentPeriod: period,
      periodLabel: labels[period]
    })
    this.loadStats()
  },

  loadStats() {
    const records = wx.getStorageSync('records') || []
    const period = this.data.currentPeriod
    
    // 根据周期筛选记录
    const now = new Date()
    let startDate, endDate
    
    if (period === 'half') {
      // 半月：当前半月的统计
      const day = now.getDate()
      if (day <= 15) {
        // 上半月
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 15)
      } else {
        // 下半月
        startDate = new Date(now.getFullYear(), now.getMonth(), 16)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      }
    } else {
      // 月度：当月
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
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
    
    periodRecords.forEach(r => {
      const amount = (r.tailPrice || 0) + (r.deposit || 0)
      if (r.isPaid) {
        paidTotal += amount
      } else {
        pendingTail += amount
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
    periodRecords.forEach(r => {
      const amount = (r.tailPrice || 0) + (r.deposit || 0)
      if (!categoryAmounts[r.category]) {
        categoryAmounts[r.category] = 0
      }
      categoryAmounts[r.category] += amount
    })
    
    const total = pendingTail + paidTotal
    const categoryStats = Object.entries(categoryAmounts)
      .map(([category, amount]) => ({
        category,
        name: categoryMap[category]?.name || '其他',
        color: categoryMap[category]?.color || '#999',
        amount: amount.toFixed(2),
        percent: total > 0 ? (amount / total * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount)

    // 近期需要尾款的记录（未来30天内未完成）
    const thirtyDaysLater = new Date()
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)
    
    const upcomingRecords = records
      .filter(r => {
        if (r.isPaid) return false
        const deadline = new Date(r.tailDeadline)
        return deadline >= now && deadline <= thirtyDaysLater
      })
      .sort((a, b) => new Date(a.tailDeadline) - new Date(b.tailDeadline))
      .slice(0, 5)

    this.setData({
      stats: {
        pendingTail: pendingTail.toFixed(2),
        paidTotal: paidTotal.toFixed(2),
        total: (pendingTail + paidTotal).toFixed(2)
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
