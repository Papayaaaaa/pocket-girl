// monthly.js
Page({
  data: {
    currentYear: 2026,
    currentMonth: 3,
    months: [],
    selectedMonth: '',
    selectedIndex: 0,
    monthData: null,
    categoryStats: [],
    upcomingList: [],
    upcomingDays: 30,
    categoryMap: {
      'guzi': { name: '谷子', color: '#FF6B9D', icon: '🎁' },
      'hanfu': { name: '汉服', color: '#52C41A', icon: '🏮' },
      'lo': { name: 'Lo裙', color: '#FF9500', icon: '👗' },
      'other': { name: '其他', color: '#8C8C8C', icon: '📦' }
    }
  },

  onLoad(options) {
    const now = new Date()
    let year = now.getFullYear()
    let month = now.getMonth() + 1
    
    if (options.year && options.month) {
      year = parseInt(options.year)
      month = parseInt(options.month)
    }
    
    this.initMonths(year, month)
  },

  initMonths(year, month) {
    const months = []
    // 过去3个月
    for (let i = 2; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1)
      const y = d.getFullYear()
      const m = d.getMonth() + 1
      months.push({
        value: `${y}-${m.toString().padStart(2, '0')}`,
        label: `${y}年${m}月`
      })
    }
    // 未来9个月
    for (let i = 1; i <= 9; i++) {
      const d = new Date(year, month - 1 + i, 1)
      const y = d.getFullYear()
      const m = d.getMonth() + 1
      months.push({
        value: `${y}-${m.toString().padStart(2, '0')}`,
        label: `${y}年${m}月`
      })
    }
    
    this.setData({
      currentYear: year,
      currentMonth: month,
      months: months,
      selectedMonth: `${year}-${month.toString().padStart(2, '0')}`,
      selectedIndex: months.findIndex(m => m.value === `${year}-${month.toString().padStart(2, '0')}`)
    })
    
    this.loadMonthData()
  },

  onMonthChange(e) {
    const index = e.detail.value
    const selectedMonth = this.data.months[index].value
    this.setData({ 
      selectedMonth,
      selectedIndex: index
    })
    this.loadMonthData()
  },

  loadMonthData() {
    const records = wx.getStorageSync('records') || []
    const selectedMonth = this.data.selectedMonth
    const [year, month] = selectedMonth.split('-').map(Number)
    
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // 筛选该月的尾款记录（按截止日期）
    const monthRecords = records.filter(r => {
      if (!r.tailDeadline) return false
      const deadline = new Date(r.tailDeadline)
      return deadline >= startDate && deadline <= endDate
    })
    
    // 统计
    let totalTail = 0
    let paidTail = 0
    let unpaidTail = 0
    let depositTotal = 0
    let paidDeposit = 0
    let paidRecords = 0
    let unpaidRecords = 0
    
    monthRecords.forEach(r => {
      const tailPrice = r.tailPrice || 0
      const deposit = r.deposit || 0
      totalTail += tailPrice
      depositTotal += deposit
      
      if (r.isPaid) {
        paidTail += tailPrice
        paidDeposit += deposit
        paidRecords++
      } else {
        unpaidTail += tailPrice
        unpaidRecords++
      }
    })
    
    // 分类统计
    const categoryAmounts = {}
    const categoryCounts = {}
    monthRecords.forEach(r => {
      const amount = (r.tailPrice || 0) + (r.deposit || 0)
      if (!categoryAmounts[r.category]) {
        categoryAmounts[r.category] = 0
        categoryCounts[r.category] = 0
      }
      categoryAmounts[r.category] += amount
      categoryCounts[r.category]++
    })
    
    const total = totalTail + depositTotal
    const categoryStats = Object.entries(categoryAmounts)
      .map(([category, amount]) => ({
        category,
        name: this.data.categoryMap[category]?.name || '其他',
        color: this.data.categoryMap[category]?.color || '#8C8C8C',
        icon: this.data.categoryMap[category]?.icon || '📦',
        amount: amount.toFixed(2),
        count: categoryCounts[category] || 0,
        percent: total > 0 ? (amount / total * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.amount - a.amount)
    
    // 未来待付日程（该月未支付的 + 未来30天内的）
    const thirtyDaysLater = new Date()
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + this.data.upcomingDays)
    
    const upcomingList = records
      .filter(r => {
        if (r.isPaid || !r.tailDeadline) return false
        const deadline = new Date(r.tailDeadline)
        // 未来30天内的，或者该月未支付的
        return (deadline >= today && deadline <= thirtyDaysLater) || (deadline.getMonth() === month - 1 && deadline.getFullYear() === year)
      })
      .sort((a, b) => new Date(a.tailDeadline) - new Date(b.tailDeadline))
      .slice(0, 10)
      .map(r => {
        const deadline = new Date(r.tailDeadline)
        const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24))
        let daysLeftText = ''
        if (daysLeft < 0) daysLeftText = '已逾期'
        else if (daysLeft === 0) daysLeftText = '今天'
        else if (daysLeft === 1) daysLeftText = '明天'
        else daysLeftText = `${daysLeft}天后`
        
        return {
          ...r,
          daysLeft,
          daysLeftText
        }
      })
    
    this.setData({
      monthData: {
        totalRecords: monthRecords.length,
        paidRecords,
        unpaidRecords,
        totalTail,
        paidTail,
        unpaidTail,
        depositTotal,
        paidDeposit
      },
      categoryStats,
      upcomingList
    })
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  markAsPaid(e) {
    const id = e.currentTarget.dataset.id
    const records = wx.getStorageSync('records') || []
    const index = records.findIndex(r => r.id === id)
    
    if (index !== -1) {
      records[index].isPaid = true
      records[index].paidAt = Date.now()
      wx.setStorageSync('records', records)
      
      wx.showToast({ title: '已支付', icon: 'success' })
      this.loadMonthData()
    }
  }
})
