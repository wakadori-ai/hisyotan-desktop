# 秘書たん一発起動スクリプト（2025-04-02 改訂）
# 管理者権限不要・実行ポリシー一時変更
# 個別起動オプション対応：-BackendOnly, -FrontendOnly, -ElectronOnly
# 通常・開発モードはバックグラウンド起動


## ========= パラメータ定義 =========

param (
    [switch]$Dev,
    [switch]$Help,
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [switch]$ElectronOnly
)

## ========= 初期設定 =========

try {
    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
    Write-Host "✅ 実行ポリシーを一時的に変更しました" -ForegroundColor Green
} catch {
    Write-Host "❌ 実行ポリシーの変更に失敗しました: $_" -ForegroundColor Red
    Pause
    exit
}

## ========= ログ出力関数 =========

function Write-Log {
    param (
        [string]$Message,
        [string]$Level = "Info"
    )
    switch ($Level) {
        "Info"    { Write-Host "ℹ️ $Message" -ForegroundColor Cyan }
        "Success" { Write-Host "✅ $Message" -ForegroundColor Green }
        "Warning" { Write-Host "⚠️ $Message" -ForegroundColor Yellow }
        "Error"   { Write-Host "❌ $Message" -ForegroundColor Red }
        "Cute"    { Write-Host "🎀 $Message" -ForegroundColor Magenta }
    }
}

## ========= ヘルプ表示 =========

if ($Help) {
    Write-Host @"
秘書たん一発起動スクリプト - ヘルプ

使用方法:
  .\start.ps1                 通常モードで起動（Electron + Backend）
  .\start.ps1 -Dev            開発モード起動（Vite + Electron + Backend）
  .\start.ps1 -BackendOnly    バックエンド（FastAPI）のみ起動
  .\start.ps1 -FrontendOnly   フロントエンド（Vite）のみ起動
  .\start.ps1 -ElectronOnly   Electronのみ起動（他は手動で起動）

オプション:
  -Dev            開発モード（Vite + HMR + Electron）
  -BackendOnly    FastAPIのみ起動（Ctrl+Cで停止可）
  -FrontendOnly   Viteのみ起動（Ctrl+Cで停止可）
  -ElectronOnly   Electronのみ起動（Ctrl+Cで停止可）
  -Help           このヘルプを表示

特徴:
  - 通常・開発モードではターミナルを閉じてもプロセスは実行されたままになります
  - 個別起動モードはCtrl+Cで停止できます（ターミナル依存）
  - アプリを終了するには通常のアプリ終了操作かタスクマネージャーを使用してください
"@ -ForegroundColor Cyan
    exit
}

## ========= 共通情報 =========

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

## ========= 個別起動モード処理 =========

if ($BackendOnly) {
    Write-Log "FastAPI バックエンドを起動します（Ctrl+Cで停止可）" "Info"
    # 直接実行することでCtrl+Cで停止できるようにする
    python -m uvicorn backend.main:app --reload --port 8000 --app-name hisyotan
    exit
}

if ($FrontendOnly) {
    Write-Log "Vite フロントエンドを起動します（Ctrl+Cで停止可）" "Info"
    # 直接実行することでCtrl+Cで停止できるようにする
    npm run dev -- --hisyotan
    exit
}

if ($ElectronOnly) {
    Write-Log "Electron アプリのみ起動します（Ctrl+Cで停止可）" "Info"
    # 直接実行することでCtrl+Cで停止できるようにする
    npm start -- --app-name=hisyotan
    exit
}

## ========= ロゴ表示 =========

function Show-Logo {
    $logo = @"
╭─────────────────────────────────────────────╮
│                                             │
│     秘書たん - かわいいAI秘書アプリ 🎀      │
│         (一発起動版 v1.1.0)                  │
│                                             │
│           ／l、                             │
│          =^ω^=                             │
│           l  |                              │
│            ノ ノ                            │
│            し'                              │
│                                             │
│          Welcome to Hisyotan!              │
╰─────────────────────────────────────────────╯
"@
    Write-Host $logo -ForegroundColor Magenta
}

Show-Logo

## ========= 既存プロセス終了処理 =========

Write-Log "既存の秘書たんプロセスを確認しています..." "Info"
# stop_hisyotan.ps1を実行して既存プロセスを終了
try {
    & "$ScriptDir\tools\stop_hisyotan.ps1"
    Write-Log "既存プロセスのクリーンアップが完了しました" "Success"
} catch {
    Write-Log "既存プロセスの終了中にエラーが発生しました: $_" "Warning"
}

## ========= 通常・開発モード起動（バックグラウンド） =========

Write-Log "秘書たんアプリを起動しています..." "Info"

if ($Dev) {
    Write-Log "🔧 開発モード（Vite + Electron）で起動します" "Info"

    # バックエンド（FastAPI）を独立プロセスとして起動
    Start-Process -FilePath "python.exe" -ArgumentList "-m", "uvicorn", "backend.main:app", "--reload", "--port", "8000", "--app-name", "hisyotan" -WindowStyle Hidden

    # Viteを独立プロセスとして起動
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev -- --hisyotan" -WindowStyle Hidden
    
    # 少し待機してからElectronを起動（Viteとバックエンドの起動を待つ）
    Start-Sleep -Seconds 5
    
    # 開発モード用Electronを独立プロセスとして起動
    $env:VITE_DEV_SERVER_URL = "http://localhost:5173/"
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npx electron . --app-name=hisyotan" -WindowStyle Hidden

    Write-Log "`n🌐 Vite: http://localhost:5173/ にアクセスできます" "Info"
    Write-Log "🌐 API: http://localhost:8000/ で起動しています" "Info" 
    Write-Log "🛠️ 変更は自動で反映されます（HMR有効）" "Info"
} else {
    # バックエンド（FastAPI）を独立プロセスとして起動
    Start-Process -FilePath "python.exe" -ArgumentList "-m", "uvicorn", "backend.main:app", "--port", "8000", "--app-name", "hisyotan" -WindowStyle Hidden
    
    # 少し待機してからElectronを起動（バックエンドの起動を待つ）
    Start-Sleep -Seconds 3
    
    # 通常モードでElectronを独立プロセスとして起動
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm start -- --app-name=hisyotan" -WindowStyle Hidden
}

Write-Log "`n✨✨ 秘書たんを起動しました！ ✨✨" "Cute"
Write-Log "💡 ターミナルを閉じてもアプリは引き続き実行されます" "Info"
Write-Log "💡 アプリを終了する場合は、タスクマネージャーから個別に終了してください" "Info"
Write-Log "🎀 今日もふにゃっと、がんばっていこ〜！" "Cute"
