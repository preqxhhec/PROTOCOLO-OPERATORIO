Set objShell = CreateObject("WScript.Shell")
objShell.Run "powershell -WindowStyle Hidden -Command ""& {python -m http.server 8000}""", 0, False
objShell.Run "cmd /c start http://localhost:8000/index.html", 0, False
Set objShell = Nothing