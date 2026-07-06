#!/bin/bash
# 双击此文件即可在浏览器中打开游戏（无需手动起服务器）
DIR="$(cd "$(dirname "$0")" && pwd)"
open "file://${DIR}/index.html"
