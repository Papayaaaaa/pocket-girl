// add.js
Page({
  data: {
    name: '',
    category: 'guzi',
    shop: '',
    deposit: '',
    tailPrice: '',
    tailDeadline: '',
    remark: '',
    images: []
  },

  onLoad(options) {
    // 如果有 id 参数，则是编辑模式
    if (options.id) {
      this.setData({ editId: options.id })
      this.loadRecord(options.id)
    }
  },

  loadRecord(id) {
    const records = wx.getStorageSync('records') || []
    const record = records.find(r => r.id === id)
    if (record) {
      this.setData({
        name: record.name,
        category: record.category,
        shop: record.shop,
        deposit: record.deposit,
        tailPrice: record.tailPrice,
        tailDeadline: record.tailDeadline,
        remark: record.remark,
        images: record.images || []
      })
    }
  },

  chooseImage() {
    wx.chooseMedia({
      count: 9 - this.data.images.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = res.tempFiles.map(f => f.tempFilePath)
        this.setData({
          images: [...this.data.images, ...newImages].slice(0, 9)
        })
      }
    })
  },

  previewImage(e) {
    const index = e.currentTarget.dataset.index
    wx.previewImage({
      current: this.data.images[index],
      urls: this.data.images
    })
  },

  deleteImage(e) {
    const index = e.currentTarget.dataset.index
    const images = [...this.data.images]
    images.splice(index, 1)
    this.setData({ images })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({ [field]: value })
    
    // 计算总价
    if (field === 'deposit' || field === 'tailPrice') {
      const deposit = field === 'deposit' ? parseFloat(value) || 0 : parseFloat(this.data.deposit) || 0
      const tailPrice = field === 'tailPrice' ? parseFloat(value) || 0 : parseFloat(this.data.tailPrice) || 0
      this.setData({ totalPrice: deposit + tailPrice })
    }
  },

  setCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({ category })
  },

  onDateChange(e) {
    this.setData({ tailDeadline: e.detail.value })
  },

  get totalPrice() {
    return (parseFloat(this.data.deposit) || 0) + (parseFloat(this.data.tailPrice) || 0)
  },

  saveRecord() {
    const { name, category, shop, deposit, tailPrice, tailDeadline, remark, editId, images } = this.data

    // 验证必填项
    if (!name) {
      wx.showToast({ title: '请输入商品名称', icon: 'none' })
      return
    }
    if (!tailDeadline) {
      wx.showToast({ title: '请选择尾款日期', icon: 'none' })
      return
    }

    const records = wx.getStorageSync('records') || []
    
    const recordData = {
      id: editId || Date.now().toString(),
      name,
      category,
      shop,
      deposit: parseFloat(deposit) || 0,
      tailPrice: parseFloat(tailPrice) || 0,
      totalPrice: this.totalPrice,
      tailDeadline,
      remark,
      images,
      isPaid: false,
      createdAt: editId ? (records.find(r => r.id === editId)?.createdAt || Date.now()) : Date.now(),
      updatedAt: Date.now()
    }

    if (editId) {
      // 更新
      const index = records.findIndex(r => r.id === editId)
      if (index !== -1) {
        records[index] = recordData
      }
    } else {
      // 新增
      records.push(recordData)
    }

    wx.setStorageSync('records', records)

    wx.showToast({
      title: editId ? '更新成功' : '保存成功',
      icon: 'success'
    })

    setTimeout(() => {
      wx.navigateBack()
    }, 1500)
  }
})
