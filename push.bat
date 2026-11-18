@echo off
echo ==============================================
echo Pushing local changes to GitHub (main branch)...
echo ==============================================
git status
git add -A
git commit -m "update: sync latest changes to main"
git push origin main
echo ==============================================
echo Push complete!
echo ==============================================
pause
