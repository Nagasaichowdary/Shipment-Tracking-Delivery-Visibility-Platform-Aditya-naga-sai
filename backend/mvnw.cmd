@echo off
setlocal
set SCRIPT_DIR=%~dp0
mvn -f "%SCRIPT_DIR%pom.xml" %*
