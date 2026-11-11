; Arena Storm: firewall liberado na instalação e limpo na desinstalação
!macro customInstall
  nsExec::Exec 'netsh advfirewall firewall delete rule name="Arena Storm"'
  nsExec::Exec 'netsh advfirewall firewall add rule name="Arena Storm" dir=in action=allow program="$INSTDIR\${APP_EXECUTABLE_FILENAME}" enable=yes profile=private,domain'
  nsExec::Exec 'netsh advfirewall firewall add rule name="Arena Storm" dir=in action=allow protocol=TCP localport=47800 enable=yes profile=private,domain'
  nsExec::Exec 'netsh advfirewall firewall add rule name="Arena Storm" dir=in action=allow protocol=UDP localport=47801 enable=yes profile=private,domain'
!macroend

!macro customUnInstall
  nsExec::Exec 'netsh advfirewall firewall delete rule name="Arena Storm"'
  ; tira do "abrir com o Windows"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "ArenaStorm"
!macroend
