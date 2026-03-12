// 云函数：AI 智能识别订单截图
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 配置 AI API
const AI_CONFIG = {
  // 可以使用 Claude OpenAI 或者其他视觉模型
  // 这里使用免费的方案作为示例
  apiUrl: 'https://api.moonshot.cn/v1/chat/completions',
  apiKey: 'YOUR_API_KEY', // 需要填入你的 API Key
  model: 'vision'
}

exports.main = async (event, context) => {
  const { imageUrl } = event
  
  try {
    // 如果没有图片 URL，返回错误
    if (!imageUrl) {
      return { success: false, error: '缺少图片' }
    }

    // 构建 AI prompt
    const prompt = `你是一个订单信息提取助手。请分析这张订单截图，提取以下信息并以 JSON 格式返回：

返回格式示例：
{
  "name": "商品名称",
  "category": "guzi/hanfu/lo/other",  // 谷子=guzi, 汉服=hanfu, Lo裙=lo, 其他=other
  "shop": "店铺名称",
  "deposit": "定金金额（数字）",
  "tailPrice": "尾款金额（数字）",
  "tailDeadline": "尾款日期（格式：YYYY-MM-DD）",
  "remark": "备注信息"
}

注意：
1. category 根据商品类型选择：谷子/手办/周边=guzi，汉服=hanfu，Lo裙=lo，其他=other
2. 如果没有尾款日期，尝试从截图内容推断
3. 如果金额不明确，设为 0
4. 只返回 JSON，不要其他文字`

    // 调用 AI API（这里以 Moonshot 为例）
    const response = await axios.post(AI_CONFIG.apiUrl, {
      model: 'vision',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ],
      temperature: 0.1
    }, {
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    })

    // 解析 AI 返回的内容
    const content = response.data.choices?.[0]?.message?.content || ''
    
    // 尝试提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const result = JSON.parse(jsonMatch[0])
        return {
          success: true,
          data: {
            name: result.name || '',
            category: result.category || 'other',
            shop: result.shop || '',
            deposit: parseFloat(result.deposit) || 0,
            tailPrice: parseFloat(result.tailPrice) || 0,
            tailDeadline: result.tailDeadline || '',
            remark: result.remark || ''
          },
          raw: content
        }
      } catch (e) {
        return {
          success: false,
          error: 'JSON 解析失败',
          raw: content
        }
      }
    }

    return {
      success: false,
      error: '无法提取订单信息',
      raw: content
    }

  } catch (error) {
    console.error('AI 识别失败:', error)
    return {
      success: false,
      error: error.message || '识别失败'
    }
  }
}
