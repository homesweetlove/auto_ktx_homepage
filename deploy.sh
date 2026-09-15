#!/bin/bash
set -e
echo "🚄 [KTX Sniper] 배포 시작..."
sudo apt update && sudo apt install -y python3 python3-pip python3-venv git
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
sudo cp ktx-sniper.service /etc/systemd/system/ktx-sniper.service
sudo systemctl daemon-reload
sudo systemctl enable --now ktx-sniper
echo "✅ 배포 완료! 상태: sudo systemctl status ktx-sniper"
