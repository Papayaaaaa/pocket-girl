// monthly.js
Page({
  data: {
    currentYear: 2026,
    currentMonth: 3,
    months: [],
    selectedMonth: '',
    monthData: null,
    categories: ['guzi', 'hanfu', 'lo', 'other'],
    categoryNames: {
      'guzi': '谷子',
      'hanfu': '汉服',
      'lo': 'Lo裙',
      'other': '其他'
    }
  },

  onLoad() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    
    // 生成最近1个月+未来11个月的选项（共12个月）
    const months = []
    // 过去1个月
    for (let i = 0; i < 1; i++) {
      const d = new Date(year, month - 1 - i, 1)
      const y = d.getFullYear()
      const m = d.getMonth() + 1
      months.push({
        value: `${y}-${m.toString().padStart(2, '0')}`,
        label: `${y}年${m}月`
      })
    }
    // 未来11个月
    for (let i = 1; i <= 11; i++) {
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
      selectedMonth: `${year}-${month.toString().padStart(2, '0')}`
    })
    
    this.loadMonthData()
  },

  onMonthChange(e) {
    const index = e.detail.value
    const selectedMonth = this.data.months[index].value
    this.setData({ selectedMonth })
    this.loadMonthData()
  },

  loadMonthData() {
    const records = wx.getStorageSync('records') || []
    const selectedMonth = this.data.selectedMonth
    const [year, month] = selectedMonth.split('-').map(Number)
    
    // 获取该月的起始和结束日期
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0) // 该月最后一天
    
    // 筛选该月的尾款记录
    const monthRecords = records.filter(r => {
      if (!r.tailDeadline) return false
      const deadline = new Date(r.tailDeadline)
      return deadline >= startDate && deadline <= endDate
    })
    
    // 按状态分类
    const paidRecords = monthRecords.filter(r => r.isPaid)
    const unpaidRecords = monthRecords.filter(r => !r.isPaid)
    
    // 计算金额
    let totalTail = 0
    let paidTail = 0
    let unpaidTail = 0
    let depositTotal = 0
    let paidDeposit = 0
    
    monthRecords.forEach(r => {
      totalTail += r.tailPrice || 0
      depositTotal += r.deposit || 0
    })
    
    paidRecords.forEach(r => {
      paidTail += r.tailPrice || 0
      paidDeposit += r.deposit || 0
    })
    
    unpaidTail = totalTail - paidTail
    
    // 按分类统计
    const categoryStats = {}
    this.data.categories.forEach(cat => {
      const catRecords = monthRecords.filter(r => r.category === cat)
      const catPaid = catRecords.filter(r => r.isPaid)
      categoryStats[cat] = {
        count: catRecords.length,
        paidCount: catPaid.length,
        total: catRecords.reduce((sum, r) => sum + (r.tailPrice || 0) + (r.deposit || 0), 0),
        paid: catPaid.reduce((sum, r) => sum + (r.tailPrice || 0) + (r.deposit || 0), 0)
      }
    })
    
    // 按日期统计（用于日历视图）
    const dailyData = {}
    monthRecords.forEach(r => {
      const day = r.tailDeadline
      if (!dailyData[day]) {
        dailyData[day] = {
          records: [],
          total: 0,
          paid: 0
        }
      }
      dailyData[day].records.push(r)
      dailyData[day].total += (r.tailPrice || 0) + (r.deposit || 0)
      if (r.isPaid) {
        dailyData[day].paid += (r.tailPrice || 0) + (r.deposit || 0)
      }
    })
    
    this.setData({
      monthData: {
        totalRecords: monthRecords.length,
        paidRecords: paidRecords.length,
        unpaidRecords: unpaidRecords.length,
        totalTail,
        paidTail,
        unpaidTail,
        depositTotal,
        paidDeposit,
        categoryStats,
        dailyData
      }
    })
  },

  // 查看详情
  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  },

  // 标记已支付
  markAsPaid(e) {
    const id = e.currentTarget.dataset.id
    const records = wx.getStorageSync('records') || []
    const index = records.findIndex(r => r.id === id)
    
    if (index !== -1) {
      records[index].isPaid = true
      records[index].paidAt = Date.now()
      wx.setStorageSync('records', records)
      
      wx.showToast({ title: '已标记支付', icon: 'success' })
      this.loadMonthData()
    }
  }
})
