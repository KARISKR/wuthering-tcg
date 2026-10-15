@echo off
title 명조 TCG 로컬 서버
echo ===================================================
echo [명조 TCG] 로컬 개발 서버를 시작합니다...
echo 브라우저가 자동으로 열립니다 (http://localhost:5173)
echo 서버를 종료하려면 이 창을 닫거나 Ctrl+C를 누르세요.
echo ===================================================
echo.

cd /d "%~dp0"
start http://localhost:5173
npm run dev
pause
