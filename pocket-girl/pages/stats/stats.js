// stats.js
Page({
  data: {
    currentPeriod: 'year',
    periodLabel: '年度',
    selectedYear: 2026,
    years: [],
    // 概览数据
    overview: {
      totalPaid: 0,      // 已支付总额（定金+尾款）
      totalPending: 0,   // 待支付总额（尾款）
      depositPaid: 0,     // 已付定金
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
    let totalPaid = 0
    let totalPending = 0
    let depositPaid = 0
    let pendingCount = 0
    let paidCount = 0
    
    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 0)
      
      // 该月支付的所有记录（按支付时间/创建时间）
      const paidInMonth = records.filter(r => {
        if (!r.createdAt) return false
        const created = new Date(r.createdAt)
        return created >= monthStart && created <= monthEnd && r.isPaid
      })
      
      // 该月到期的所有记录（按尾款截止日）
      const dueInMonth = records.filter(r => {
        if (!r.tailDeadline) return false
        const deadline = new Date(r.tailDeadline)
        return deadline >= monthStart && deadline <= monthEnd
      })
      
      let paid = 0
      let pending = 0
      let deposit = 0
      
      // 已支付：定金算在创建月份，尾款算在尾款截止月份
      paidInMonth.forEach(r => {
        const depositAmt = r.deposit || 0
        const tailPrice = r.tailPrice || 0
        // 定金在创建月统计
        deposit += depositAmt
        // 尾款在尾款截止月统计（这里简化处理，算在尾款到期月）
      })
      
      // 按尾款截止日统计已支付尾款
      dueInMonth.filter(r => r.isPaid).forEach(r => {
        paid += r.tailPrice || 0
        paidCount++
      })
      
      // 未支付的尾款
      dueInMonth.filter(r => !r.isPaid).forEach(r => {
        pending += r.tailPrice || 0
        pendingCount++
      })
      
      // 计算该月已支付总额 = 定金（当月创建的）+ 尾款（当月到期的已支付）
      const monthPaid = deposit + dueInMonth.filter(r => r.isPaid).reduce((sum, r) => sum + (r.tailPrice || 0), 0)
      
      // 判断是过去还是未来
      const isPast = monthEnd < today
      const isCurrent = monthStart <= today && monthEnd >= today
      
      if (isPast) {
        totalPaid += monthPaid
        depositPaid += deposit
      } else {
        totalPending += pending
      }
      
      monthlyData.push({
        month: month + 1,
        label: (month + 1) + '月',
        paid: monthPaid.toFixed(2),
        deposit: deposit.toFixed(2),
        pending: pending.toFixed(2),
        total: (monthPaid + pending).toFixed(2),
        isPast,
        isCurrent,
        count: paidInMonth.length + dueInMonth.length
      })
    }
    
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
        totalPaid: totalPaid.toFixed(2),
        totalPending: totalPending.toFixed(2),
        depositPaid: depositPaid.toFixed(2),
        pendingCount,
        paidCount
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
