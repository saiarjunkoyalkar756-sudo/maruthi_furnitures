@echo off
title Maruthi Furnitures App Server
cd /d "%~dp0"
echo ====================================================
echo  Maruthi Furnitures & Mattresses - Server Running
echo  Apache Proxy: http://localhost/
echo  Direct Port:  http://localhost:3000/
echo ====================================================
node node_modules\next\dist\bin\next start
pause

