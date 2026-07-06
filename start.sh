#!/bin/bash
# 启动本地预览服务器并打开浏览器
DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=8765
if lsof -i :$PORT >/dev/null 2>&1; then
  echo "端口 $PORT 已有服务在运行"
else
  nohup python3 -m http.server $PORT --directory "$DIR" >/tmp/zy_http.log 2>&1 &
  sleep 1
fi
open "http://127.0.0.1:$PORT/index.html"
