# 秘書たん一発起動スクリプト（2025-04-04 改訂）
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
    # PowerShellモジュールを明示的にインポート
    Import-Module Microsoft.PowerShell.Security
    # 実行ポリシーを変更
    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force -ErrorAction SilentlyContinue
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
    
    # PID情報を保存するオブジェクトを作成
    $procInfoFile = "$env:TEMP\hisyotan_processes.json"
    $procInfo = @{
        "Vite" = $null
        "Backend" = $null
        "Electron" = $null
        "StartTime" = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    }
    
    # Viteプロセスの起動（passThruせず、直接実行）
    # 起動前にPIDファイルを削除（万が一の残存PIDファイル対策）
    $vitePidFile = "$env:TEMP\hisyotan_vite_pid.txt"
    $viteInfoFile = "$env:TEMP\hisyotan_vite_info.json"
    if (Test-Path $vitePidFile) {
        Remove-Item $vitePidFile -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $viteInfoFile) {
        Remove-Item $viteInfoFile -Force -ErrorAction SilentlyContinue
    }
    
    # コンソールに制御を保ちながら実行（Ctrl+Cで停止可能）
    Write-Log "✨ Viteサーバーを起動しています..." "Info"
    # タイトルを設定してからnpm run devを実行
    cmd /c "title hisyotan_vite && npm run dev -- --host"
    exit
}

if ($ElectronOnly) {
    Write-Log "Electron アプリのみ起動します（Ctrl+Cで停止可）" "Info"
    # 環境変数を設定
    $env:HISYOTAN_APP_NAME = "hisyotan"
    
    # 新しいプリロードパスを指定（開発モードと本番モードで分岐）
    if ($Dev) {
        $env:HISYOTAN_PRELOAD_PATH = "./frontend/src/main/preload/preload.js"
        $env:HISYOTAN_PAW_PRELOAD_PATH = "./frontend/src/main/preload/paw-preload.js"
    } else {
        $env:HISYOTAN_PRELOAD_PATH = "./dist/preload.js"
        $env:HISYOTAN_PAW_PRELOAD_PATH = "./dist/paw-preload.js"
    }
    
    # 直接実行することでCtrl+Cで停止できるようにする
    npx electron .
    exit
}

## ========= ロゴ表示 =========

function Show-Logo {
    $logo = @"
╭─────────────────────────────────────────────╮
│                                             │
│     秘書たん - かわいいAI秘書アプリ 🎀      │
│         (一発起動版 v1.2.0)                  │
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

## ========= Viteサーバー起動確認関数 =========

function Wait-ForViteServer {
    param (
        [int]$Port = 5173,
        [int]$TimeoutSeconds = 30,
        [string]$InfoFilePath
    )
    
    Write-Log "Viteサーバーの起動を待機しています (ポート:$Port)..." "Info"
    
    $timer = [System.Diagnostics.Stopwatch]::StartNew()
    $connected = $false
    
    # ログファイルの一時パス
    $tempLogFile = "$env:TEMP\hisyotan_vite_log.txt"
    $procPidFile = "$env:TEMP\hisyotan_vite_pid.txt"
    
    try {
        # 別プロセスでnpm run devを実行し、出力をファイルに書き込む
        $viteProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "title hisyotan_vite && npm run dev -- --host" -WindowStyle Hidden -RedirectStandardOutput $tempLogFile -PassThru
        
        # PIDを一時ファイルに保存
        $viteProcess.Id | Out-File $procPidFile -Force
        Write-Log "✨ Viteサーバー起動 (PID: $($viteProcess.Id))" "Success"

        # 詳細な情報をJSON形式で保存
        $viteInfo = @{
            "PID" = $viteProcess.Id
            "Name" = $viteProcess.Name
            "StartTime" = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
            "WindowTitle" = "hisyotan_vite"
            "CommandLine" = "npm run dev -- --host"
        }
        if ($InfoFilePath) {
            $viteInfo | ConvertTo-Json | Out-File $InfoFilePath -Force
        }

        # 起動確認ループ
        while ($timer.Elapsed.TotalSeconds -lt $TimeoutSeconds -and -not $connected) {
            try {
                # WebRequestを使用してサーバーが応答可能か確認
                $response = Invoke-WebRequest "http://localhost:$Port" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
                if ($response.StatusCode -eq 200) {
                    Write-Log "✅ Viteサーバーへの接続に成功しました (HTTP 200応答)" "Success"
                    $connected = $true
                    break
                }
            } catch {
                # 起動中の場合はログをチェック
                if (Test-Path $tempLogFile) {
                    $logContent = Get-Content $tempLogFile -Raw
                    # VITEが準備完了のメッセージをチェック（ログ確認も補助的に残す）
                    if ($logContent -match "VITE v\d+\.\d+\.\d+ ready" -or $logContent -match "Local:.*http://localhost:$Port/") {
                        Write-Log "✨ Viteサーバー起動メッセージを検出しました" "Success"
                        # メッセージが見つかっても、再度WebRequestで確認
                        Start-Sleep -Seconds 1
                        continue
                    }
                }
                
                # 少し待ってから再確認
                Start-Sleep -Seconds 1
                Write-Log "⏳ Viteサーバーの起動を待機中... (経過: $([math]::Round($timer.Elapsed.TotalSeconds, 1))秒)" "Info"
            }
        }
    }
    finally {
        # 一時ファイルをクリーンアップ
        if (Test-Path $tempLogFile) {
            Remove-Item $tempLogFile -Force -ErrorAction SilentlyContinue
        }
    }
    
    $timer.Stop()
    
    if ($connected) {
        Write-Log "✅ Viteサーバーの起動を確認しました (${([math]::Round($timer.Elapsed.TotalSeconds, 1))}秒)" "Success"
        return $true
    } else {
        Write-Log "❌ Viteサーバーの起動確認ができませんでした (タイムアウト: $TimeoutSeconds秒)" "Error"
        # 起動失敗時にはプロセスを終了し、PIDファイルを削除
        if (Test-Path $procPidFile) {
            $vitePid = Get-Content $procPidFile
            try {
                Stop-Process -Id $vitePid -Force -ErrorAction SilentlyContinue
                Write-Log "🧹 Viteプロセスを終了しました (PID: $vitePid)" "Info"
            } catch {
                # エラーは無視
            }
            Remove-Item $procPidFile -Force -ErrorAction SilentlyContinue
        }
        return $false
    }
}

## ========= 通常・開発モード起動（バックグラウンド） =========

Write-Log "秘書たんアプリを起動しています..." "Info"
$procInfoFile = "$env:TEMP\hisyotan_processes.json"
$procInfo = @{
    "Vite" = $null
    "Backend" = $null
    "Electron" = $null
    "StartTime" = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
}

if ($Dev) {
    Write-Log "🔧 開発モード（Vite + Electron）で起動します" "Info"

    # 必要なファイルパスを定義
    $vitePidFile = "$env:TEMP\hisyotan_vite_pid.txt"
    $viteInfoFile = "$env:TEMP\hisyotan_vite_info.json"

    # バックエンド（FastAPI）を独立プロセスとして起動
    $backendProcess = Start-Process -FilePath "python.exe" -ArgumentList "-m", "uvicorn", "backend.main:app", "--reload", "--port", "8000", "--app-name", "hisyotan" -WindowStyle Hidden -PassThru
    $procInfo["Backend"] = $backendProcess.Id
    Write-Log "🚀 バックエンド起動: プロセスID $($backendProcess.Id)" "Info"

    # Viteサーバーの起動を確認 (この関数内で起動も行う)
    if (Wait-ForViteServer -Port 5173 -TimeoutSeconds 30 -InfoFilePath $viteInfoFile) {
        # PIDファイルからVite PIDを取得
        if (Test-Path $vitePidFile) {
            $procInfo["Vite"] = Get-Content $vitePidFile
            Write-Log "💾 Vite PID情報を記録しました (PID: $($procInfo["Vite"]))" "Info"
        }

        # 詳細情報ファイルをチェック
        if (Test-Path $viteInfoFile) {
            Write-Log "💾 Viteプロセス詳細情報を保存済み" "Info"
        }

        # 開発モード用Electronを独立プロセスとして起動
        $env:VITE_DEV_SERVER_URL = "http://localhost:5173/"
        $env:HISYOTAN_APP_NAME = "hisyotan"  # 環境変数として渡す
        
        # 新しいpreloadパスを設定（開発モード用）
        $env:HISYOTAN_PRELOAD_PATH = "./frontend/src/main/preload/preload.js"
        $env:HISYOTAN_PAW_PRELOAD_PATH = "./frontend/src/main/preload/paw-preload.js"
        
        # APIホスト設定（両方の形式をサポート）
        $env:API_HOST = "127.0.0.1"
        
        # CSP設定を追加（開発モード用）
        $env:ELECTRON_DISABLE_SECURITY_WARNINGS = "true"
        $env:ELECTRON_CSP = @"
default-src 'self' 'unsafe-inline' 'unsafe-eval';
connect-src 'self' 
    http://localhost:5173 http://127.0.0.1:5173 
    http://localhost:8000 http://127.0.0.1:8000 
    ws://localhost:5173 ws://127.0.0.1:5173 
    ws://localhost:8000 ws://127.0.0.1:8000;
img-src 'self' data: blob:;
media-src 'self' data: blob:;
"@ -replace "`n", " "
        
        # 引数なしで単純に起動する（すべての情報は環境変数経由で）
        $electronProcess = Start-Process -FilePath "pwsh" -ArgumentList "-Command", "npx electron ." -WindowStyle Hidden -PassThru
        $procInfo["Electron"] = $electronProcess.Id
        Write-Log "💫 Electron起動: プロセスID $($electronProcess.Id)" "Info"
        
        # プロセス情報をJSONで保存
        $procInfo | ConvertTo-Json | Out-File $procInfoFile -Force
        
        Write-Log "`n🌐 Vite: http://localhost:5173/ にアクセスできます" "Info"
        Write-Log "🌐 API: http://localhost:8000/ で起動しています" "Info" 
        Write-Log "🛠️ 変更は自動で反映されます（HMR有効）" "Info"
    } else {
        Write-Log "❌ Viteサーバーの起動に失敗したため、Electronを起動できませんでした" "Error"
    }
} else {
    # バックエンド（FastAPI）を独立プロセスとして起動
    $backendProcess = Start-Process -FilePath "python.exe" -ArgumentList "-m", "uvicorn", "backend.main:app", "--port", "8000", "--app-name", "hisyotan" -WindowStyle Hidden -PassThru
    $procInfo["Backend"] = $backendProcess.Id
    Write-Log "🚀 バックエンド起動: プロセスID $($backendProcess.Id)" "Info"
    
    # バックエンドの起動を待機
    Start-Sleep -Seconds 3
    
    # 通常モードでElectronを独立プロセスとして起動
    $env:HISYOTAN_APP_NAME = "hisyotan"  # 環境変数として渡す
    
    # 新しいpreloadパスを設定（本番ビルド用）
    $env:HISYOTAN_PRELOAD_PATH = "./dist/preload.js"
    $env:HISYOTAN_PAW_PRELOAD_PATH = "./dist/paw-preload.js"
    
    # APIホスト設定（両方の形式をサポート）
    $env:API_HOST = "127.0.0.1"
    
    # CSP設定を追加（本番モード用）
    $env:ELECTRON_DISABLE_SECURITY_WARNINGS = "true"
    $env:ELECTRON_CSP = @"
default-src 'self' 'unsafe-inline' 'unsafe-eval';
connect-src 'self' 
    http://localhost:8000 http://127.0.0.1:8000 
    ws://localhost:8000 ws://127.0.0.1:8000;
img-src 'self' data: blob:;
media-src 'self' data: blob:;
"@ -replace "`n", " "
    
    $electronProcess = Start-Process -FilePath "pwsh" -ArgumentList "-Command", "npx electron ." -WindowStyle Hidden -PassThru
    $procInfo["Electron"] = $electronProcess.Id
    Write-Log "💫 Electron起動: プロセスID $($electronProcess.Id)" "Info"
    
    # プロセス情報をJSONで保存
    $procInfo | ConvertTo-Json | Out-File $procInfoFile -Force
}

Write-Log "`n✨✨ 秘書たんを起動しました！ ✨✨" "Cute"
Write-Log "💡 ターミナルを閉じてもアプリは引き続き実行されます" "Info"
Write-Log "💡 アプリを終了する場合は、タスクマネージャーから個別に終了してください" "Info"
Write-Log "🎀 今日もふにゃっと、がんばっていこ〜！" "Cute"
