#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""股票播报脚本 - 格式化输出"""
import urllib.request
import json
from datetime import datetime

def get_kline(code, market):
    """获取当日K线数据"""
    try:
        url = f"https://push2his.eastmoney.com/api/qt/stock/kline/get?secid={market}.{code}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=0&beg=20260312&end=20260313"
        with urllib.request.urlopen(url, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            if data.get('data', {}).get('klines'):
                kline = data['data']['klines'][-1].split(',')
                return {
                    'open': float(kline[1]),
                    'close': float(kline[2]),
                    'high': float(kline[3]),
                    'low': float(kline[4]),
                    'pct': float(kline[8]),
                }
    except:
        pass
    return None

def get_us_stock(code='NDX', market='100'):
    """获取美股数据"""
    try:
        url = f"https://push2his.eastmoney.com/api/qt/stock/kline/get?secid={market}.{code}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=0&beg=20260312&end=20260313"
        with urllib.request.urlopen(url, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            if data.get('data', {}).get('klines'):
                kline = data['data']['klines'][-1].split(',')
                return {
                    'name': data['data'].get('name', '纳斯达克'),
                    'open': float(kline[1]),
                    'close': float(kline[2]),
                    'pct': float(kline[8]),
                }
    except:
        pass
    return None

def get_gold():
    """获取黄金期货数据"""
    try:
        url = "https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=90.BK1617&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=0&beg=20260312&end=20260313"
        with urllib.request.urlopen(url, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            if data.get('data', {}).get('klines'):
                kline = data['data']['klines'][-1].split(',')
                return {
                    'open': float(kline[1]),
                    'close': float(kline[2]),
                    'pct': float(kline[8]),
                }
    except:
        pass
    return None

def fmt_stock(data):
    """格式化股票数据"""
    emoji = '📈' if data['pct'] >= 0 else '📉'
    sign = '+' if data['pct'] >= 0 else ''
    return f"开{data['open']:.2f} / 收{data['close']:.2f} {emoji} {sign}{data['pct']:.2f}%"

def get_stock_data():
    # A股
    stocks = [
        ('上证指数', '000001', '1'),
        ('深证成指', '399001', '0'),
        ('创业板指', '399006', '0'),
    ]
    
    # 港股
    hk_stocks = [
        ('恒生指数', 'HSI', '100'),
        ('国企指数', 'HSCEI', '100'),
    ]
    
    results = []
    
    for name, code, market in stocks:
        data = get_kline(code, market)
        if data:
            results.append(f"• {name}: {fmt_stock(data)}")
        else:
            results.append(f"• {name}: 暂无数据")
    
    hk_results = []
    for name, code, market in hk_stocks:
        data = get_kline(code, market)
        if data:
            hk_results.append(f"• {name}: {fmt_stock(data)}")
        else:
            hk_results.append(f"• {name}: 暂无数据")
    
    # 美股
    us_data = get_us_stock('NDX', '100')
    if us_data:
        us_result = f"• {us_data['name']}: {fmt_stock(us_data)}"
    else:
        us_result = "• 纳斯达克综指: 暂无数据"
    
    # 黄金
    gold_data = get_gold()
    if gold_data:
        gold_result = f"• 沪金期货(元/克): {fmt_stock(gold_data)}"
    else:
        gold_result = "• 沪金期货(元/克): 暂无数据"
    
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    msg = f"""📊 每日股市播报
📅 {now}
🇨🇳 【A股】
{results[0]}
{results[1]}
{results[2]}
🇭🇰 【港股】
{hk_results[0]}
{hk_results[1]}
🇺🇸 【美股】
{us_result}
🥇 【黄金】
{gold_result}
━━━━━━━━━━━━━━━
💡 数据仅供参考，投资需谨慎"""
    
    print(msg)

if __name__ == "__main__":
    get_stock_data()
