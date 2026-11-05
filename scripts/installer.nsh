!macro customUnInstall
  ; Match the explicit name used by Electron's setLoginItemSettings.
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Desktop Cat"
!macroend
