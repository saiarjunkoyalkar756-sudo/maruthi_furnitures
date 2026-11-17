Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\suman\Downloads\maruthi"
WshShell.Run """C:\Program Files\nodejs\node.exe"" ""C:\Users\suman\Downloads\maruthi\node_modules\next\dist\bin\next"" start", 0, False

