// index.js
const app = getApp()

Page({
  data: {
    records: [],
    filterType: 'all',
    filteredRecords: [],
    // 汇总数据
    summary: {
      pendingCount: 0,
      pendingAmount: 0,
      paidCount: 0,
      paidAmount: 0,
      overdueCount: 0
    },
    // 搜索
    searchQuery: '',
    isSearching: false,
    // 批量选择
    isBatchMode: false,
    selectedIds: [],
    // TabBar 50px height workaround
    scrollTop: 0
  },

  onShow() {
    this.loadRecords()
  },

  loadRecords() {
    const records = wx.getStorageSync('records') || []
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    const processed = records.map(item => {
      const deadline = new Date(item.tailDeadline)
      const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24))
      
      const categoryMap = {
        'guzi': '谷子',
        'hanfu': '汉服',
        'lo': 'Lo裙',
        'other': '其他'
      }
      
      return {
        ...item,
        categoryText: categoryMap[item.category] || '其他',
        daysLeft: daysLeft,
        isOverdue: !item.isPaid && daysLeft < 0
      }
    })
    
    // 按状态和日期排序：未付款逾期 > 未付款快到期 > 已付款
    processed.sort((a, b) => {
      if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1
      // 未付款的按到期时间排序（快的在前）
      if (!a.isPaid) return a.daysLeft - b.daysLeft
      return 0
    })
    
    // 计算汇总
    const summary = {
      pendingCount: processed.filter(r => !r.isPaid).length,
      pendingAmount: processed.filter(r => !r.isPaid).reduce((sum, r) => sum + (r.tailPrice || 0), 0),
      paidCount: processed.filter(r => r.isPaid).length,
      paidAmount: processed.filter(r => r.isPaid).reduce((sum, r) => sum + (r.tailPrice || 0), 0),
      overdueCount: processed.filter(r => r.isOverdue).length
    }
    
    this.setData({ 
      records: processed,
      summary: summary
    })
    this.applyFilter()
  },

  // 搜索
  onSearchInput(e) {
    this.setData({ searchQuery: e.detail.value })
    this.applyFilter()
  },

  toggleSearch() {
    const isSearching = !this.data.isSearching
    this.setData({ 
      isSearching,
      searchQuery: isSearching ? this.data.searchQuery : ''
    })
    if (!isSearching) {
      this.applyFilter()
    }
  },

  clearSearch() {
    this.setData({ searchQuery: '' })
    this.applyFilter()
  },

  // 筛选
  setFilter(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ filterType: type })
    this.applyFilter()
  },

  applyFilter() {
    const { records, filterType, searchQuery } = this.data
    let filtered = records
    
    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(query) ||
        r.shop.toLowerCase().includes(query) ||
        r.categoryText.includes(query)
      )
    }
    
    // 状态过滤
    if (filterType === 'pending') {
      filtered = filtered.filter(r => !r.isPaid)
    } else if (filterType === 'paid') {
      filtered = filtered.filter(r => r.isPaid)
    } else if (filterType === 'overdue') {
      filtered = filtered.filter(r => r.isOverdue)
    }
    
    this.setData({ filteredRecords: filtered })
  },

  // 批量选择
  toggleBatchMode() {
    this.setData({ 
      isBatchMode: !this.data.isBatchMode,
      selectedIds: []
    })
  },

  toggleSelect(e) {
    const id = e.currentTarget.dataset.id
    const selectedIds = [...this.data.selectedIds]
    const index = selectedIds.indexOf(id)
    
    if (index > -1) {
      selectedIds.splice(index, 1)
    } else {
      selectedIds.push(id)
    }
    
    this.setData({ selectedIds })
  },

  selectAll() {
    const allIds = this.data.filteredRecords.map(r => r.id)
    this.setData({ selectedIds: allIds })
  },

  deselectAll() {
    this.setData({ selectedIds: [] })
  },

  // 批量删除
  batchDelete() {
    if (this.data.selectedIds.length === 0) return
    
    wx.showModal({
      title: '批量删除',
      content: `确定要删除选中的 ${this.data.selectedIds.length} 条记录吗？`,
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          const records = wx.getStorageSync('records') || []
          const filtered = records.filter(r => !this.data.selectedIds.includes(r.id))
          wx.setStorageSync('records', filtered)
          
          this.setData({ 
            isBatchMode: false,
            selectedIds: []
          })
          this.loadRecords()
          
          wx.showToast({ title: '删除成功', icon: 'success' })
        }
      }
    })
  },

  // 快捷支付尾款
  quickPay(e) {
    const id = e.currentTarget.dataset.id
    const records = wx.getStorageSync('records') || []
    const index = records.findIndex(r => r.id === id)
    
    if (index !== -1) {
      records[index].isPaid = true
      records[index].paidAt = Date.now()
      wx.setStorageSync('records', records)
      
      this.loadRecords()
      wx.showToast({ title: '已支付', icon: 'success' })
    }
  },

  goToAdd() {
    wx.navigateTo({ url: '/pages/add/add' })
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  goToSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' })
  },

  goToMonthly() {
    wx.navigateTo({ url: '/pages/monthly/monthly' })
  },

  goToYearly() {
    wx.navigateTo({ url: '/pages/yearly/yearly' })
  },

  // 导出数据
  exportData() {
    const records = wx.getStorageSync('records') || []
    const exportData = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      records: records
    }
    
    const jsonStr = JSON.stringify(exportData, null, 2)
    const buffer = wx.base64ToArrayBuffer(wx.arrayBufferToBase64(
      new TextEncoder().encode(jsonStr)
    ))
    
    wx.saveFile({
      tempFilePath: wx.env.USER_DATA_PATH + '/尾款助手备份.json',
      success: (res) => {
        wx.showShareMenu({
          withShareTicket: true,
          menus: ['shareAppMessage', 'shareTimeline']
        })
        
        wx.showModal({
          title: '导出成功',
          content: '数据已导出，是否分享给朋友？',
          confirmText: '分享',
          success: (modal) => {
            if (modal.confirm) {
              // 触发分享
            }
          }
        })
      },
      fail: () => {
        wx.showToast({ title: '导出失败', icon: 'none' })
      }
    })
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '尾款助手 - 二次元/汉服/Lo裙记录',
      path: '/pages/index/index'
    }
  },

  onShareTimeline() {
    return {
      title: '尾款助手 - 二次元/汉服/Lo裙记录'
    }
  }
})
