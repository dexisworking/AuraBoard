; AuraBoard NSIS Custom Script
; Registers the screensaver (.scr) file in Windows

!macro customInstall
  ; Copy the exe as a .scr file to the installation directory (user writable)
  CopyFiles "$INSTDIR\AuraBoard.exe" "$INSTDIR\AuraBoard.scr"

  ; Register the screensaver in the Windows registry
  WriteRegStr HKCU "Control Panel\Desktop" "SCRNSAVE.EXE" "$INSTDIR\AuraBoard.scr"
  WriteRegStr HKCU "Control Panel\Desktop" "ScreenSaveActive" "1"
  WriteRegStr HKCU "Control Panel\Desktop" "ScreenSaveTimeOut" "300"
!macroend

!macro customUnInstall
  ; Remove the screensaver file
  Delete "$INSTDIR\AuraBoard.scr"

  ; Clean up registry entries (only if they point to our screensaver)
  ReadRegStr $0 HKCU "Control Panel\Desktop" "SCRNSAVE.EXE"
  ${If} $0 == "$INSTDIR\AuraBoard.scr"
    DeleteRegValue HKCU "Control Panel\Desktop" "SCRNSAVE.EXE"
  ${EndIf}
!macroend
