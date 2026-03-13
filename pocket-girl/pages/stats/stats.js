// stats.js
Page({
  data: {
    currentPeriod: 'year', // 'month', 'half', 'year'
    periodLabel: '年度',
    selectedYear: 2026,
    years: [],
    // 概览数据
    overview: {
      pastPaid: 0,      // 过去已支付
      futurePending: 0,  // 未来待支付
      pendingCount: 0,
      paidCount: 0
    },
    // 月度数据
    monthlyData: [],
    // 分类统计
    categoryStats: [],
    // 近期待付
    upcomingRecords: []
  },

  onLoad() {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let i = currentYear + 1; i >= currentYear - 2; i--) {
      years.push(i)
    }
    this.setData({ 
      years, 
      selectedYear: currentYear 
    })
    this.loadStats()
  },

  onShow() {
    this.loadStats()
  },

  onYearChange(e) {
    const index = e.detail.value
    this.setData({ 
      selectedYear: this.data.years[index]
    })
    this.loadStats()
  },

  switchPeriod(e) {
    const period = e.currentTarget.dataset.period
    const labels = { month: '月度', half: '半年', year: '年度' }
    this.setData({
      currentPeriod: period,
      periodLabel: labels[period]
    })
    this.loadStats()
  },

  loadStats() {
    const records = wx.getStorageSync('records') || []
    const year = this.data.selectedYear
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    // 按月统计
    const monthlyData = []
    let pastPaid = 0
    let futurePending = 0
    let pendingCount = 0
    let paidCount = 0
    
    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 0)
      const isPast = monthEnd < today
      const isCurrent = monthStart <= today && monthEnd >= today
      
      const monthRecords = records.filter(r => {
        if (!r.tailDeadline) return false
        const deadline = new Date(r.tailDeadline)
        return deadline >= monthStart && deadline <= monthEnd
      })
      
      let paid = 0
      let pending = 0
      
      monthRecords.forEach(r => {
        const amount = (r.tailPrice || 0) + (r.deposit || 0)
        if (r.isPaid) {
          paid += amount
          paidCount++
        } else {
          pending += amount
          pendingCount++
        }
      })
      
      // 过去的月份统计已支付，未来的统计待支付
      if (isPast) {
        pastPaid += paid
      } else {
        futurePending += pending
      }
      
      monthlyData.push({
        month: month + 1,
        label: (month + 1) + '月',
        paid: paid.toFixed(2),
        pending: pending.toFixed(2),
        total: (paid + pending).toFixed(2),
        isPast,
        isCurrent,
        count: monthRecords.length
      })
    }
    
    // 根据周期筛选数据
    let filteredData = monthlyData
    if (this.data.currentPeriod === 'month') {
      // 当月
      const currentMonth = now.getMonth()
      filteredData = [monthlyData[currentMonth]]
    } else if (this.data.currentPeriod === 'half') {
      // 半年：当前半年
      const currentMonth = now.getMonth()
      if (currentMonth < 6) {
        filteredData = monthlyData.slice(0, 6)
      } else {
        filteredData = monthlyData.slice(6, 12)
      }
    }
    
    // 计算筛选后的统计
    let periodPaid = 0
    let periodPending = 0
    filteredData.forEach(m => {
      periodPaid += parseFloat(m.paid)
      periodPending += parseFloat(m.pending)
    })
    
    // 分类统计（当年所有）
    const categoryMap = {
      'guzi': { name: '谷子', color: '#FF6B9D', icon: '🎁' },
      'hanfu': { name: '汉服', color: '#52C41A', icon: '🏮' },
      'lo': { name: 'Lo裙', color: '#FF9500', icon: '👗' },
      'other': { name: '其他', color: '#8E8E93', icon: '📦' }
    }
    
    const yearRecords = records.filter(r => {
      if (!r.tailDeadline) return false
      const deadline = new Date(r.tailDeadline)
      return deadline.getFullYear() === year
    })
    
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
        color: categoryMap[category]?.color || '#8E8E93',
        icon: categoryMap[category]?.icon || '📦',
        amount: amount.toFixed(2),
        count: categoryCounts[category] || 0,
        percent: total > 0 ? (amount / total * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.amount - a.amount)
    
    // 近期待付（未来30天）
    const thirtyDaysLater = new Date()
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)
    
    const upcomingRecords = records
      .filter(r => {
        if (r.isPaid || !r.tailDeadline) return false
        const deadline = new Date(r.tailDeadline)
        return deadline >= today && deadline <= thirtyDaysLater
      })
      .sort((a, b) => new Date(a.tailDeadline) - new Date(b.tailDeadline))
      .slice(0, 5)

    this.setData({
      overview: {
        pastPaid: pastPaid.toFixed(2),
        futurePending: futurePending.toFixed(2),
        pendingCount,
        paidCount
      },
      periodStats: {
        paid: periodPaid.toFixed(2),
        pending: periodPending.toFixed(2),
        total: (periodPaid + periodPending).toFixed(2)
      },
      monthlyData,
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
