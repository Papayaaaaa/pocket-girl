#!/bin/bash
# 早报抓取脚本 - 每天早上9:45执行

# 配置
CHANNEL="feishu"
TARGET="ou_92d640fefd4a0f1deae337a7d0507984"

# 抓取澎湃新闻
PAPER=$(curl -s "https://www.thepaper.cn/" | grep -oP '(?<=href="/newsDetail_forward_)\d+(?=")' | head -5 | while read id; do
    title=$(curl -s "https://www.thepaper.cn/newsDetail_forward_$id" | grep -oP '(?<=<title>).*?(?=</title>)' | head -1)
    echo "- $title"
done)

# 抓取新浪新闻
SINA=$(curl -s "https://news.sina.com.cn/" | grep -oP '(?<=<a href=")https?://[^"]*(?="[^>]*>)' | head -10 | grep -v "javascript" | head -5)

# 抓取观察者网
GUANCHA=$(curl -s "https://www.guancha.cn/" | grep -oP '(?<=href=")/[^"]+(?=")' | grep -v "^/" | head -5)

# 合成早报
MESSAGE="📰 早报 - $(date '+%Y年%m月%d日')

【澎湃新闻】
$PAPER

【新浪新闻】
$SINA

【观察者网】
$GUANCHA"

# 发送消息
openclaw message send --channel "$CHANNEL" --target "$TARGET" --message "$MESSAGE"
