# 秘書たん一発起動スクリプト
# 管理者権限は不要になりました
# 2025-04-01 改訂

# スクリプトの実行ポリシーを一時的に変更
try {
    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
    Write-Host "✅ 実行ポリシーを一時的に変更しました" -ForegroundColor Green
} catch {
    Write-Host "❌ 実行ポリシーの変更に失敗しました: $_" -ForegroundColor Red
    Pause
    exit
}

# ディレクトリ設定
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppName = "秘書たん"
$LogDir = Join-Path $ScriptDir "logs"

# ログディレクトリ確認
if (-not (Test-Path $LogDir)) {
    try {
        New-Item -Path $LogDir -ItemType Directory -Force | Out-Null
        Write-Host "📁 ログディレクトリを作成しました: $LogDir" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ ログディレクトリの作成に失敗しました: $LogDir" -ForegroundColor Red
    }
}

# ロゴ表示
function Show-Logo {
    $logo = @"
    
    ╭─────────────────────────────────────────────╮
    │                                             │
    │     秘書たん - かわいいAI秘書アプリ 🎀      │
    │         (一発起動版 v1.0.0)                  │
    │                                             │
    │           ／l、                             │
    │          (  'ω' )                          │
    │           l  |                              │
    │            ノ ノ                            │
    │            し'                              │
    │                                             │
    │          Welcome to Hisyotan!              │
    │                                             │
    ╰─────────────────────────────────────────────╯
    
"@
    Write-Host $logo -ForegroundColor Magenta
}

# メイン処理
try {
    Show-Logo
    Write-Host "🚀 秘書たんを起動しています..." -ForegroundColor Cyan
    
    # VOICEVOXの起動確認（オプション）
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:50021/speakers" -Method GET -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ VOICEVOXは正常に動作しています ✨" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️ VOICEVOXに接続できません。音声機能が使えない可能性があります" -ForegroundColor Yellow
        Write-Host "   必要に応じてVOICEVOXを起動してください" -ForegroundColor Yellow
    }
    
    # アプリケーション起動（バックグラウンドでnpm startを実行）
    Write-Host "🌟 秘書たんを起動しています..." -ForegroundColor Cyan
    
    # npmコマンドをバックグラウンドで実行（ウィンドウを表示しない）
    Start-Process -FilePath "npm" -ArgumentList "start" -WindowStyle Hidden -WorkingDirectory $ScriptDir
    
    # 起動完了メッセージ
    Write-Host "`n✨✨ 秘書たんを起動しました！ ✨✨`n" -ForegroundColor Magenta
    Write-Host "💡 メインプロセスが自動的にバックエンドを起動します" -ForegroundColor Cyan
    Write-Host "💡 Electronを閉じるとバックエンドも自動的に終了します" -ForegroundColor Cyan
    Write-Host "`n😊 ご利用ありがとうございます！`n" -ForegroundColor Magenta
    
} catch {
    Write-Host "❌ エラーが発生しました: $_" -ForegroundColor Red
    Pause
    exit 1
} 