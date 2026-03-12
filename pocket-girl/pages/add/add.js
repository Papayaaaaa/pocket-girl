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
    images: [],
    isRecognizing: false
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

  // OCR 识别文字
  recognizeImage() {
    if (this.data.isRecognizing) return
    
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.setData({ isRecognizing: true })
        wx.showLoading({ title: '识别中...' })
        
        // 调用微信 OCR API
        wx.serviceMarket.invokeService({
          service: 'wx79ac3c8e6304e6d2',
          api: 'OcrAllInOne',
          data: {
            type: 'image',
            image: {
              filePath: tempFilePath
            },
            ocr_type: 'all_in_one'
          },
          success: (res) => {
            wx.hideLoading()
            this.parseOCRResult(res.data)
          },
          fail: (err) => {
            wx.hideLoading()
            this.setData({ isRecognizing: false })
            console.error('OCR识别失败:', err)
            wx.showToast({
              title: '识别失败，请重试',
              icon: 'none'
            })
          }
        })
      }
    })
  },

  // 解析 OCR 结果并填充表单
  parseOCRResult(ocrData) {
    const text = ocrData.words_result || []
    const fullText = text.map(item => item.words).join('')
    
    console.log('OCR识别结果:', fullText)
    
    // 尝试提取信息
    let name = this.data.name
    let deposit = this.data.deposit
    let tailPrice = this.data.tailPrice
    let tailDeadline = this.data.tailDeadline
    let shop = this.data.shop
    
    // 提取金额（查找价格相关词汇后面的数字）
    const priceRegex = /(\d+\.?\d*)\s*(元|块|圆)?/g
    const prices = []
    let match
    while ((match = priceRegex.exec(fullText)) !== null) {
      const price = parseFloat(match[1])
      if (price > 0 && price < 100000) {
        prices.push(price)
      }
    }
    
    // 提取日期
    const dateRegex = /(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})/
    const dateMatch = fullText.match(dateRegex)
    if (dateMatch) {
      tailDeadline = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
    }
    
    // 提取金额到定金和尾款
    if (prices.length >= 2) {
      // 假设第一个是定金，第二个是尾款
      deposit = prices[0].toString()
      tailPrice = prices[1].toString()
    } else if (prices.length === 1) {
      // 只有一个金额，设为尾款
      tailPrice = prices[0].toString()
    }
    
    // 尝试提取商品名称（取前面较短的文本）
    const lines = fullText.split(/[\n,，]/).filter(l => l.trim())
    if (lines.length > 0 && !name) {
      // 找最短的那行作为名称
      const shortest = lines.reduce((a, b) => a.length < b.length ? a : b)
      if (shortest.length > 0 && shortest.length < 30) {
        name = shortest.trim()
      }
    }
    
    // 更新数据
    this.setData({
      name,
      deposit,
      tailPrice,
      tailDeadline,
      shop,
      isRecognizing: false
    })
    
    wx.showToast({
      title: '识别完成，请核对',
      icon: 'success'
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
