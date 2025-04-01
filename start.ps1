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

# パラメータの定義
param (
    [switch]$Dev,
    [switch]$Help
)

# ヘルプの表示
if ($Help) {
    Write-Host @"
秘書たん一発起動スクリプト - ヘルプ

使用方法:
  .\start.ps1             通常モードで起動
  .\start.ps1 -Dev        開発モードで起動（Vite + HMR対応）
  .\start.ps1 -Help       このヘルプを表示

オプション:
  -Dev        開発モードで起動します（Vite開発サーバー + Electron）
  -Help       ヘルプを表示して終了します
"@ -ForegroundColor Cyan
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

# VOICEVOXが起動しているか確認する関数
function Test-VOICEVOXAvailable {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:50021/speakers" -Method GET -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ VOICEVOXは正常に動作しています ✨" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "⚠️ VOICEVOXに接続できません: $($_.Exception.Message)" -ForegroundColor Yellow
        return $false
    }
    return $false
}

# VOICEVOXを自動起動する関数
function Start-VOICEVOXEngine {
    Write-Host "🔄 VOICEVOXエンジンを起動しています..." -ForegroundColor Cyan
    
    # VOICEVOXのインストールパスを探索
    $possiblePaths = @(
        "C:\Users\$env:USERNAME\AppData\Local\Programs\VOICEVOX\vv-engine\run.exe"
    )
    
    $voicevoxPath = $null
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $voicevoxPath = $path
            Write-Host "🔍 VOICEVOXを発見しました: $path" -ForegroundColor Green
            break
        }
    }
    
    try {
        if ($voicevoxPath) {
            Start-Process -FilePath $voicevoxPath -WindowStyle Minimized
            Write-Host "🚀 VOICEVOXエンジンを起動しました。初期化を待機中..." -ForegroundColor Cyan
            
            # 起動を待つ（最大30秒）
            $retryCount = 0
            $maxRetry = 10
            $success = $false
            
            while ($retryCount -lt $maxRetry -and -not $success) {
                Start-Sleep -Seconds 3
                $success = Test-VOICEVOXAvailable
                if (-not $success) {
                    Write-Host "⌛ VOICEVOXエンジン起動待機中... ($($retryCount+1)/$maxRetry)" -ForegroundColor Yellow
                }
                $retryCount++
            }
            
            if ($success) {
                Write-Host "✅ VOICEVOXエンジンが正常に起動しました 🎤" -ForegroundColor Green
                return $true
            } else {
                Write-Host "⚠️ VOICEVOXエンジンの応答を確認できませんでした。対応が必要かもしれません" -ForegroundColor Yellow
                Write-Host "   URL: http://127.0.0.1:50021/speakers でVOICEVOXの状態を確認してください" -ForegroundColor Yellow
                return $false
            }
        } else {
            Write-Host "⚠️ VOICEVOXエンジンが見つかりません。インストールされているか確認してください" -ForegroundColor Yellow
            Write-Host "   オプション: 手動でVOICEVOXを起動することもできます" -ForegroundColor Yellow
            return $false
        }
    } catch {
        Write-Host "❌ VOICEVOXエンジンの起動中にエラーが発生しました: $_" -ForegroundColor Red
        return $false
    }
}

# メイン処理
try {
    Show-Logo
    Write-Host "🚀 秘書たんを起動しています..." -ForegroundColor Cyan
    
    # VOICEVOXの起動確認と自動起動
    $voicevoxRunning = Test-VOICEVOXAvailable
    if (-not $voicevoxRunning) {
        Write-Host "🔄 VOICEVOXエンジンが実行されていません。自動起動を試みます..." -ForegroundColor Yellow
        $voicevoxStartResult = Start-VOICEVOXEngine
        if (-not $voicevoxStartResult) {
            Write-Host "⚠️ 音声機能は利用できません。VOICEVOXエンジンを手動で起動してください" -ForegroundColor Yellow
            Write-Host "   👉 引き続き他の機能の起動を続行します" -ForegroundColor Cyan
        }
    }
    
    # アプリケーション起動
    Write-Host "🌟 秘書たんアプリを起動しています..." -ForegroundColor Cyan
    
    # 開発モードかどうかでコマンドを変更
    if ($Dev) {
        Write-Host "🔧 開発モードで起動します（Vite + Electron）" -ForegroundColor Cyan
        
        # PowerShellのジョブ機能を使用してバックグラウンドで実行
        $job = Start-Job -ScriptBlock {
            param($workDir)
            Set-Location $workDir
            # 開発モードで実行
            npm run dev:electron
        } -ArgumentList $ScriptDir
    } else {
        # PowerShellのジョブ機能を使用してバックグラウンドで実行（通常モード）
        $job = Start-Job -ScriptBlock {
            param($workDir)
            Set-Location $workDir
            # バッチファイルを経由して実行
            cmd.exe /c "npm start"
        } -ArgumentList $ScriptDir
    }
    
    # 起動完了メッセージ
    Write-Host "`n✨✨ 秘書たんを起動しました！ ✨✨`n" -ForegroundColor Magenta
    Write-Host "💡 メインプロセスが自動的にバックエンドを起動します" -ForegroundColor Cyan
    Write-Host "💡 Electronを閉じるとバックエンドも自動的に終了します" -ForegroundColor Cyan
    
    if ($Dev) {
        Write-Host "`n🔧 開発モード情報:" -ForegroundColor Yellow
        Write-Host "   🌐 Vite開発サーバー: http://localhost:3000/" -ForegroundColor Yellow
        Write-Host "   💻 HMR (Hot Module Replacement) は有効です" -ForegroundColor Yellow
        Write-Host "   🛠️ コードを変更すると自動的に更新されます" -ForegroundColor Yellow
    }
    
    if (-not $voicevoxRunning -and -not $voicevoxStartResult) {
        Write-Host "`n⚠️ 注意: VOICEVOXが起動していないため、音声合成機能は使えません" -ForegroundColor Yellow
        Write-Host "   👉 VOICEVOXを手動で起動すると、音声機能が使えるようになります" -ForegroundColor Yellow
    }
    
    Write-Host "`n😊 ご利用ありがとうございます！`n" -ForegroundColor Magenta
    
} catch {
    Write-Host "❌ エラーが発生しました: $_" -ForegroundColor Red
    Pause
    exit 1
} 