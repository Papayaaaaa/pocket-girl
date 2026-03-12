// 云函数：AI 智能识别订单截图
// 使用说明：
// 1. 用户需要在设置页面配置 AI API Key
// 2. 如果未配置 API Key，会自动回退到 OCR 识别

const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { imageUrl, apiKey, apiProvider } = event
  
  // 如果没有配置 API Key，返回标志让前端使用 OCR
  if (!apiKey) {
    return { 
      success: false, 
      needConfig: true,
      message: '请先在设置中配置 AI API Key' 
    }
  }

  // 根据选择的 AI 提供商配置
  let AI_CONFIG = {}
  
  switch (apiProvider) {
    case 'moonshot':
      AI_CONFIG = {
        apiUrl: 'https://api.moonshot.cn/v1/chat/completions',
        model: 'vision'
      }
      break
    case 'openai':
      AI_CONFIG = {
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o'
      }
      break
    case 'anthropic':
      AI_CONFIG = {
        apiUrl: 'https://api.anthropic.com/v1/messages',
        model: 'claude-3-5-sonnet-20241022'
      }
      break
    default:
      return { success: false, error: '未知的 AI 提供商' }
  }

  try {
    // 构建 AI prompt
    const prompt = `你是一个订单信息提取助手。请分析这张订单截图，提取以下信息并以 JSON 格式返回：

返回格式：
{"name":"商品名称","category":"guzi/hanfu/lo/other","shop":"店铺名称","deposit":"定金金额","tailPrice":"尾款金额","tailDeadline":"尾款日期YYYY-MM-DD","remark":"备注"}

category 说明：
- guzi = 谷子/手办/周边
- hanfu = 汉服
- lo = Lo裙/JK制服
- other = 其他

注意：
1. 只返回 JSON，不要其他文字
2. 如果信息不明确，字段设为空字符串或 0
3. 日期格式必须为 YYYY-MM-DD`

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
