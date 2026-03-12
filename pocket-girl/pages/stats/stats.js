// stats.js
Page({
  data: {
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

  loadStats() {
    const records = wx.getStorageSync('records') || []
    
    // 计算总览
    let pendingTail = 0
    let paidTotal = 0
    
    records.forEach(r => {
      if (r.isPaid) {
        paidTotal += r.totalPrice
      } else {
        pendingTail += r.tailPrice
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
    records.forEach(r => {
      if (!categoryAmounts[r.category]) {
        categoryAmounts[r.category] = 0
      }
      categoryAmounts[r.category] += r.totalPrice
    })
    
    const total = pendingTail + paidTotal
    const categoryStats = Object.entries(categoryAmounts)
      .map(([category, amount]) => ({
        category,
        name: categoryMap[category]?.name || '其他',
        color: categoryMap[category]?.color || '#999',
        amount,
        percent: total > 0 ? (amount / total * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount)

    // 近期需要尾款的记录（未完成，7天内）
    const now = new Date()
    const upcomingRecords = records
      .filter(r => {
        if (r.isPaid) return false
        const deadline = new Date(r.tailDeadline)
        const daysLeft = (deadline - now) / (1000 * 60 * 60 * 24)
        return daysLeft <= 7
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
