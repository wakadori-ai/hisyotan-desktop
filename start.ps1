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
"@ -ForegroundColor Cyan
    exit
}

## ========= 共通情報 =========

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

## ========= 個別起動モード処理 =========

if ($BackendOnly) {
    Write-Log "FastAPI バックエンドを起動します（Ctrl+Cで停止可）" "Info"
    python -m uvicorn backend.main:app --reload --port 8000
    exit
}

if ($FrontendOnly) {
    Write-Log "Vite フロントエンドを起動します（Ctrl+Cで停止可）" "Info"
    npm run dev
    exit
}

if ($ElectronOnly) {
    Write-Log "Electron アプリのみ起動します（Ctrl+Cで停止可）" "Info"
    npm start
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
│          (  'ω' )                          │
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

## ========= 通常・開発モード起動（バックグラウンド） =========

Write-Log "秘書たんアプリを起動しています..." "Info"

if ($Dev) {
    Write-Log "🔧 開発モード（Vite + Electron）で起動します" "Info"

    Start-Job -ScriptBlock {
        param($dir)
        Set-Location $dir
        npm run dev:electron
    } -ArgumentList $ScriptDir | Out-Null

    Write-Log "`n🌐 Vite: http://localhost:3000/ にアクセスできます" "Info"
    Write-Log "🛠️ 変更は自動で反映されます（HMR有効）" "Info"
} else {
    Start-Job -ScriptBlock {
        param($dir)
        Set-Location $dir
        cmd.exe /c "npm start"
    } -ArgumentList $ScriptDir | Out-Null
}

Write-Log "`n✨✨ 秘書たんを起動しました！ ✨✨" "Cute"
Write-Log "💡 Electronを閉じるとバックエンドも自動終了します" "Info"
Write-Log "🎀 今日もふにゃっと、がんばっていこ〜！" "Cute"
