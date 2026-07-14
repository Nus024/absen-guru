Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "D:\NUS\AbsenNew\Bot 2026"
WshShell.Run "cmd /c node index.js --botname=absen-2026 > start-bot.log 2>&1", 0
Set WshShell = Nothing