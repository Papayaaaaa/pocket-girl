// 云函数：发送尾款提醒
// 需要配置微信服务号模板消息

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 模板消息配置
const TEMPLATE_ID = 'YOUR_TEMPLATE_ID' // 在服务号后台获取

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext

  try {
    const db = cloud.database()
    
    // 获取用户的提醒设置
    const userSetting = await db.collection('user_settings')
      .where({ _openid: OPENID })
      .get()

    if (!userSetting.data.length || !userSetting.data[0].subscribeReminder) {
      return { success: false, message: '用户未开启提醒' }
    }

    // 获取即将到期的订单（3天内）
    const threeDaysLater = new Date()
    threeDaysLater.setDate(threeDaysLater.getDate() + 3)
    
    const records = await db.collection('records')
      .where({
        _openid: OPENID,
        isPaid: false,
        tailDeadline: db.command.lte(threeDaysLater.toISOString().split('T')[0])
      })
      .get()

    if (records.data.length === 0) {
      return { success: false, message: '没有即将到期的尾款' }
    }

    // 发送服务号模板消息
    // 需要先调用微信统一接口获取 access_token
    const accessToken = await getAccessToken()

    const sendResults = await Promise.all(records.data.map(record => {
      return cloud.fetch({
        url: `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`,
        method: 'POST',
        data: {
          touser: OPENID,
          template_id: TEMPLATE_ID,
          data: {
            first: {
              value: `⏰ 尾款提醒：${record.name}`,
              color: '#173177'
            },
            keyword1: {
              value: record.name,
              color: '#333333'
            },
            keyword2: {
              value: `¥${record.tailPrice}`,
              color: '#07C160'
            },
            keyword3: {
              value: record.tailDeadline,
              color: '#FF6B6B'
            },
            remark: {
              value: '请记得按时支付尾款哦～',
              color: '#999999'
            }
          }
        }
      })
    }))

    return {
      success: true,
      count: sendResults.length
    }

  } catch (error) {
    console.error('发送提醒失败:', error)
    return { success: false, error: error.message }
  }
}

// 获取 access_token（需要缓存）
async function getAccessToken() {
  const appId = 'YOUR_APPID'       // 服务号 AppID
  const appSecret = 'YOUR_APPSECRET' // 服务号 AppSecret

  // 实际生产中应该缓存 access_token
  const res = await cloud.fetch({
    url: `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`,
    method: 'GET'
  })

  if (!res.data || !res.data.access_token) {
    throw new Error('获取 access_token 失败')
  }

  return res.data.access_token
}
