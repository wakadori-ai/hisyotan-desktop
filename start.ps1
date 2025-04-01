# 7DTD秘書たん起動スクリプト
# Windows環境専用
# 管理者権限が必要です

# 管理者権限チェック
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ 管理者権限が必要です。管理者として再起動します..." -ForegroundColor Yellow
    
    # 現在のスクリプトパスを取得
    $scriptPath = $MyInvocation.MyCommand.Definition
    
    # 管理者として自分自身を再起動
    try {
        Start-Process PowerShell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`"" -Verb RunAs
        exit
    } catch {
        Write-Host "❌ 管理者として再起動に失敗しました: $_" -ForegroundColor Red
        Write-Host "🔄 右クリックして「管理者として実行」を選択してください" -ForegroundColor Yellow
        Pause
        exit
    }
}

# スクリプトの実行ポリシーを一時的に変更（管理者権限が必要）
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
$AppName = "7DTD秘書たん"
$BackendDir = Join-Path $ScriptDir "backend"
$FrontendDir = $ScriptDir
$DataDir = Join-Path $BackendDir "data"
$AssetsDir = Join-Path $ScriptDir "assets"
$ImagesDir = Join-Path $AssetsDir "images"

# ログディレクトリ設定（新規：logs/ ディレクトリに変更）
$LogDir = Join-Path $ScriptDir "logs"
$StartupLogFile = Join-Path $LogDir "startup_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
$FrontendLogFile = Join-Path $LogDir "frontend.log"
$BackendLogFile = Join-Path $LogDir "backend.log"

# ディレクトリ構造の確認と作成
$RequiredDirs = @(
    $LogDir,
    (Join-Path $DataDir "temp"),
    (Join-Path $DataDir "static"),
    (Join-Path $DataDir "dialogues")
)

foreach ($Dir in $RequiredDirs) {
    if (-not (Test-Path $Dir)) {
        try {
            New-Item -Path $Dir -ItemType Directory -Force | Out-Null
            Write-Host "📁 ディレクトリを作成しました: $Dir" -ForegroundColor Cyan
        } catch {
            Write-Host "❌ ディレクトリの作成に失敗しました: $Dir" -ForegroundColor Red
        }
    }
}

# ロゴ表示
function Show-Logo {
    $logo = @"
    
    ╭─────────────────────────────────────────────╮
    │                                             │
    │     7DTD秘書たん - かわいいAI秘書アプリ 🎀    │
    │       起動スクリプト v1.3.0                  │
    │                                             │
    │           ／l、                             │
    │          (  'ω' )                          │
    │           l  |                              │
    │            ノ ノ                            │
    │            し'                              │
    │                                             │
    │       Welcome to 7DTD Hisyotan!            │
    │                                             │
    ╰─────────────────────────────────────────────╯
    
"@
    Write-Host $logo -ForegroundColor Magenta
}

# ログ出力関数
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO",
        [string]$LogFile = $StartupLogFile,
        [switch]$NoConsole
    )
    
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogMessage = "$Timestamp [$Level] $Message"
    
    # ログファイルに書き込み
    Add-Content -Path $LogFile -Value $LogMessage
    
    # NoConsoleスイッチがない場合のみコンソールに出力
    if (-not $NoConsole) {
        # コンソールの色を設定
        $color = switch ($Level) {
            "INFO"  { "White" }
            "WARN"  { "Yellow" }
            "ERROR" { "Red" }
            "OK"    { "Green" }
            default { "Gray" }
        }
        
        Write-Host $LogMessage -ForegroundColor $color
    }
}

# 依存関係チェック関数
function Test-Dependencies {
    # Pythonのチェック
    try {
        $pythonVersion = python --version 2>&1
        if ($pythonVersion -match "Python 3\.[8-9]|3\.1[0-9]") {
            Write-Log "Pythonを確認しました: $pythonVersion" "OK"
        } else {
            Write-Log "Python 3.8以上が必要です。現在のバージョン: $pythonVersion" "WARN"
        }
    } catch {
        Write-Log "Pythonが見つかりません。インストールしてください" "ERROR"
        return $false
    }
    
    # Nodeのチェック
    try {
        $nodeVersion = node --version
        Write-Log "Nodeを確認しました: $nodeVersion" "OK"
    } catch {
        Write-Log "Node.jsが見つかりません。インストールしてください" "ERROR"
        return $false
    }
    
    return $true
}

# 表情アセットのチェック関数
function Test-EmotionAssets {
    Write-Log "表情アセットを確認しています..." "INFO"
    $requiredEmotions = @("normal", "happy", "sad", "angry", "surprised", "soft")
    $missingEmotions = @()
    
    foreach ($emotion in $requiredEmotions) {
        $emotionFile = Join-Path $ImagesDir "secretary_${emotion}.png"
        if (-not (Test-Path $emotionFile)) {
            $missingEmotions += $emotion
        }
    }
    
    if ($missingEmotions.Count -gt 0) {
        Write-Log "以下の表情ファイルが見つかりません: $($missingEmotions -join ', ')" "WARN"
        
        # softファイルがない場合は特別な警告
        if ($missingEmotions -contains "soft") {
            Write-Log "「soft」表情が定義されていません。コードで使用されている場合はエラーになります" "WARN"
            Write-Log "assets/images/secretary_soft.pngを追加するか、コード内の表情参照を修正してください" "INFO"
        }
        
        return $false
    } else {
        Write-Log "すべての表情アセットが正常に確認されました" "OK"
        return $true
    }
}

# VOICEVOXが起動しているか確認する関数
function Test-VOICEVOXAvailable {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:50021/speakers" -Method GET -TimeoutSec 3
        if ($response.StatusCode -eq 200) {
            Write-Log "VOICEVOXが正常に動作しています ✨" "OK"
            return $true
        }
    } catch {
        Write-Log "VOICEVOXに接続できません: $($_.Exception.Message)" "WARN"
        return $false
    }
    return $false
}

# VOICEVOXエンジンを起動する関数
function Start-VOICEVOXEngine {
    Write-Log "VOICEVOXエンジンを起動しています..." "INFO"
    
    # VOICEVOXのインストールパスを探索
    $possiblePaths = @(
        "C:\Program Files\VOICEVOX\vv-engine\run.exe",
        "C:\Users\$env:USERNAME\AppData\Local\Programs\VOICEVOX\vv-engine\run.exe",
        "C:\Users\wakad\AppData\Local\Programs\VOICEVOX\vv-engine\run.exe"
    )
    
    $voicevoxEnginePath = $null
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $voicevoxEnginePath = $path
            break
        }
    }
    
    try {
        if ($voicevoxEnginePath) {
            Write-Log "VOICEVOXエンジンを検出しました: $voicevoxEnginePath" "INFO"
            Start-Process -FilePath $voicevoxEnginePath -WindowStyle Minimized
            Write-Log "VOICEVOXエンジンを起動しました。初期化を待機中..." "OK"
            
            # 起動を待つ（最大60秒）
            $retryCount = 0
            $maxRetry = 20
            $success = $false
            
            while ($retryCount -lt $maxRetry -and -not $success) {
                Start-Sleep -Seconds 3
                $success = Test-VOICEVOXAvailable
                if (-not $success) {
                    Write-Log "VOICEVOXエンジン起動待機中... ($($retryCount+1)/$maxRetry)" "INFO"
                }
                $retryCount++
            }
            
            if ($success) {
                Write-Log "VOICEVOXエンジンが正常に起動しました 🎤" "OK"
                return $true
            } else {
                Write-Log "VOICEVOXエンジンの応答を確認できませんでした。手動確認が必要かもしれません" "WARN"
                Write-Log "ブラウザでhttp://127.0.0.1:50021/speakersにアクセスしてVOICEVOXの状態を確認してください" "INFO"
                return $false
            }
        } else {
            Write-Log "VOICEVOXエンジンが見つかりません。インストールされているか確認してください" "ERROR"
            Write-Log "VOICEVOXをインストールするか、手動で起動してください" "INFO"
            return $false
        }
    } catch {
        Write-Log "VOICEVOXエンジンの起動中にエラーが発生しました: $_" "ERROR"
        return $false
    }
}

# Pythonの仮想環境を確認・作成する関数
function Initialize-PythonEnvironment {
    Write-Log "Pythonの仮想環境を初期化しています..."
    
    # 仮想環境が存在するか確認
    $VenvPath = Join-Path $BackendDir ".venv"
    $PythonExe = Join-Path $VenvPath "Scripts\python.exe"
    
    if (-not (Test-Path $PythonExe)) {
        Write-Log "仮想環境が見つかりません。新しく作成します..." "WARN"
        
        # 親ディレクトリに移動してから仮想環境を作成
        Push-Location $BackendDir
        try {
            Write-Host "🔄 Python仮想環境を作成中..." -ForegroundColor Cyan
            python -m venv .venv
            if (-not $?) {
                Write-Log "仮想環境の作成に失敗しました" "ERROR"
                return $false
            }
            Write-Log "仮想環境を作成しました" "OK"
        } finally {
            Pop-Location
        }
    } else {
        Write-Log "既存の仮想環境を使用します" "OK"
    }
    
    # 依存パッケージをインストール
    Write-Log "依存パッケージをインストールしています..."
    $RequirementsFile = Join-Path $ScriptDir "requirements.txt"
    if (Test-Path $RequirementsFile) {
        Write-Host "🔄 パッケージをインストール中..." -ForegroundColor Cyan
        & $PythonExe -m pip install -r $RequirementsFile
        if (-not $?) {
            Write-Log "依存パッケージのインストールに失敗しました" "ERROR"
            return $false
        }
        Write-Log "依存パッケージをインストールしました" "OK"
    } else {
        Write-Log "requirements.txtが見つかりません" "WARN"
    }
    
    return $true
}

# バックエンドが応答するまで待機する関数
function Wait-BackendReady {
    param(
        [int]$MaxRetry = 15,     # 最大リトライ回数を増やす（対応時間を長く）
        [int]$WaitSeconds = 2
    )
    
    Write-Log "バックエンドの準備ができるのを待機しています..." "INFO"
    $retryCount = 0
    $success = $false
    $endpoints = @(
        "http://localhost:8000/health",
        "http://127.0.0.1:8000/health",  # 明示的にIPアドレスでも試す
        "http://localhost:8000/",        # ルートパスも試す
        "http://127.0.0.1:8000/"
    )
    
    # 最初にポートの待機（通信の有無に関わらず、ポートがオープンされるのを待つ）
    Write-Host "🔍 バックエンドのポートを確認中..." -ForegroundColor Cyan
    $portReady = $false
    for ($i = 1; $i -le 5; $i++) {
        try {
            $connection = New-Object System.Net.Sockets.TcpClient
            $connection.Connect("127.0.0.1", 8000)
            if ($connection.Connected) {
                $portReady = $true
                Write-Host "✨ ポート8000が利用可能になりました" -ForegroundColor Green
                $connection.Close()
                break
            }
        } catch {
            Write-Host "⌛ ポート待機中... ($i/5)" -ForegroundColor Yellow
        } finally {
            if ($connection) { $connection.Dispose() }
        }
        Start-Sleep -Seconds 1
    }
    
    # ポートが開いていれば少し待機してからAPIリクエスト開始（起動処理の時間を確保）
    if ($portReady) {
        Write-Host "🌱 FastAPIの初期化を待機中..." -ForegroundColor Cyan
        Start-Sleep -Seconds 3
    }
    
    # 次にHTTPリクエストでの応答確認
    Write-Host "🔄 バックエンドAPIの応答を確認しています..." -ForegroundColor Cyan
    while ($retryCount -lt $MaxRetry -and -not $success) {
        $retryCount++
        
        # ログファイルをチェックして起動完了メッセージを探す（FastAPIの起動完了メッセージを検出）
        if (Test-Path $BackendLogFile) {
            $logContent = Get-Content $BackendLogFile -Tail 20 -ErrorAction SilentlyContinue
            if ($logContent -match "アプリケーション設定を初期化しました" -or $logContent -match "Application startup complete") {
                Write-Host "📝 バックエンドの起動ログを検出しました" -ForegroundColor Green
                $success = $true
                break
            }
        }
        
        # 複数のエンドポイントを順番に試す
        foreach ($endpoint in $endpoints) {
            try {
                $apiCheck = Invoke-WebRequest -Uri $endpoint -Method GET -TimeoutSec 1 -UseBasicParsing -ErrorAction Stop
                if ($apiCheck.StatusCode -eq 200) {
                    $success = $true
                    Write-Log "バックエンドAPIが応答しました ✅ (エンドポイント: $endpoint)" "OK"
                    break
                }
            } catch {
                # 特に処理しない（次のエンドポイントを試す）
            }
        }
        
        if (-not $success) {
            if ($retryCount % 3 -eq 0) {
                Write-Host "⏳ バックエンド待機中... ($retryCount/$MaxRetry)" -ForegroundColor Yellow
            }
            Start-Sleep -Seconds $WaitSeconds
        }
    }
    
    if (-not $success) {
        Write-Log "バックエンドからの応答が確認できませんでした。起動に問題がある可能性があります" "WARN"
        
        # タイムアウト時の詳細情報
        if (Test-Path $BackendLogFile) {
            $lastLogs = Get-Content $BackendLogFile -Tail 5 -ErrorAction SilentlyContinue
            Write-Log "バックエンドの最新ログ:" "INFO"
            foreach ($line in $lastLogs) {
                Write-Log "  > $line" "INFO"
            }
        }
        
        # ポート使用状況を確認
        try {
            $portInfo = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
            if ($portInfo) {
                $processId = $portInfo.OwningProcess
                $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                Write-Log "ポート8000は現在 $($process.ProcessName) (PID: $processId) が使用中です" "INFO"
            } else {
                Write-Log "ポート8000は現在使用されていません。バックエンドが起動していない可能性があります" "WARN"
            }
        } catch {
            # ポート確認に失敗した場合は無視
        }
        
        return $false
    }
    
    # WebSocketの初期化に追加の待機時間
    Write-Log "WebSocket接続の準備ができるまでさらに待機しています..." "INFO"
    Start-Sleep -Seconds 2
    
    return $true
}

# バックエンドを非同期で起動する関数（新規）
function Start-BackendAsync {
    $VenvPython = Join-Path $BackendDir ".venv\Scripts\python.exe"
    $BackendScript = Join-Path $BackendDir "main.py"
    
    Write-Log "バックエンドを非同期で起動します... 💫" "INFO"
    
    try {
        # ゾンビ検出を有効化するフラグを追加
        $BackendArgs = "$BackendScript --enable-monitoring --zombie-detection"
        
        # バックエンドを起動し、ログファイルにリダイレクト
        $startCommand = "& { & '$VenvPython' $BackendArgs } > '$BackendLogFile' 2>&1"
        $backendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-Command", $startCommand -WindowStyle Hidden -WorkingDirectory $BackendDir -PassThru
        
        # プロセスIDをグローバル変数に保存
        $global:BackendProcessId = $backendProcess.Id
        
        Write-Log "バックエンドを起動しました (PID: $($backendProcess.Id))" "INFO" -NoConsole
        Write-Host "🚀 バックエンド起動開始... (ログ: $BackendLogFile)" -ForegroundColor Cyan
        Write-Host "   🧟‍♀️ ゾンビ検出有効化フラグを設定しました" -ForegroundColor Cyan
        
        return $true
    } catch {
        Write-Log "バックエンドの起動に失敗しました: $_" "ERROR"
        return $false
    }
}

# フロントエンドを非同期で起動する関数（新規）
function Start-FrontendAsync {
    Write-Log "フロントエンド (Electron) を非同期で起動します... 🌟" "INFO"
    
    try {
        # 現在のディレクトリを保存
        $currentLocation = Get-Location
        
        # フロントエンドディレクトリに移動
        Set-Location $FrontendDir
        
        # 依存関係を確認・インストール
        Write-Log "Node.js依存関係を確認しています..." "INFO" -NoConsole
        Write-Host "📦 Node.js依存関係を確認しています..." -ForegroundColor Cyan
        npm install --no-audit | Out-File -FilePath $FrontendLogFile -Append
        
        if (-not $?) {
            Write-Log "依存関係のインストールに問題が発生しました。処理を続行します" "WARN" -NoConsole
        } else {
            Write-Log "依存関係の確認が完了しました" "OK" -NoConsole
        }
        
        # Electronアプリを非同期で起動（バックグラウンドジョブとして）
        Write-Log "Electronアプリを起動しています..." "INFO" -NoConsole
        
        $startCommand = "npm run start >> `"$FrontendLogFile`" 2>&1"
        $encodedCommand = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($startCommand))
        
        Start-Process powershell.exe -ArgumentList "-NoProfile", "-EncodedCommand", $encodedCommand -WindowStyle Hidden
        
        Write-Host "🚀 フロントエンド起動開始... (ログ: $FrontendLogFile)" -ForegroundColor Cyan
        
        # 元のディレクトリに戻る
        Set-Location $currentLocation
        
        return $true
    } catch {
        Write-Log "フロントエンドの起動に失敗しました: $_" "ERROR"
        
        # エラーが発生した場合も元のディレクトリに戻る
        if ($currentLocation) {
            Set-Location $currentLocation
        }
        
        return $false
    }
}

# バックエンドとフロントエンドを並列で起動する関数（新規）
function Start-ApplicationParallel {
    # 表情アセットのチェック
    $emotionAssetsOk = Test-EmotionAssets
    if (-not $emotionAssetsOk) {
        Write-Log "一部の表情アセットが見つかりません。機能が制限される可能性があります" "WARN"
    }
    
    # VOICEVOXの起動確認
    Write-Log "VOICEVOXの起動を確認しています..."
    $voicevoxRunning = Test-VOICEVOXAvailable
    if (-not $voicevoxRunning) {
        Write-Log "VOICEVOXエンジンが実行されていません。自動起動します..." "INFO"
        $voicevoxStartResult = Start-VOICEVOXEngine
        if (-not $voicevoxStartResult) {
            Write-Log "音声機能は利用できません。VOICEVOXエンジンを手動で起動してください" "WARN"
            Write-Log "引き続き他の機能の起動を続行します" "INFO"
        }
    }
    
    # バックエンドを非同期で起動
    $backendStarted = Start-BackendAsync
    if (-not $backendStarted) {
        Write-Log "バックエンドの起動に失敗しました。処理を中断します" "ERROR"
        return $false
    }
    
    # フロントエンドを非同期で起動
    $frontendStarted = Start-FrontendAsync
    if (-not $frontendStarted) {
        Write-Log "フロントエンドの起動に失敗しました。処理を中断します" "ERROR"
        return $false
    }
    
    # バックエンド起動を待機
    Write-Host "🔄 バックエンドの応答を確認しています..." -ForegroundColor Cyan
    $backendReady = Wait-BackendReady -MaxRetry 10 -WaitSeconds 2
    
    if ($backendReady) {
        Write-Host "✅ FastAPI起動成功！ バックエンドの準備ができました💫" -ForegroundColor Green
    } else {
        Write-Host "⚠️ FastAPI起動状態不明… ちょっと様子を見てみるね🤔" -ForegroundColor Yellow
        Write-Log "バックエンドの準備ができていない可能性がありますが、処理を続行します" "WARN"
    }
    
    # フロントエンドの起動確認（単純なプロセス確認）
    $npmProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*electron*" }
    
    if ($npmProcesses) {
        Write-Host "✅ Electron起動成功！ フロントエンドの準備ができました✨" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Electron起動状態不明… 画面が出てくるか様子を見てみるね🙄" -ForegroundColor Yellow
        Write-Log "Electronプロセスを確認できませんでした。ログを確認してください" "WARN"
    }
    
    return $true
}

# メイン処理
try {
    Show-Logo
    Write-Log "$AppName 起動スクリプトを開始します 🌸"
    
    # 依存関係チェック
    $DepsOk = Test-Dependencies
    if (-not $DepsOk) {
        Write-Log "依存関係の確認に失敗しました。必要なソフトウェアをインストールしてください" "ERROR"
        Pause
        exit 1
    }
    
    # 環境初期化
    $InitResult = Initialize-PythonEnvironment
    if (-not $InitResult) {
        Write-Log "環境の初期化に失敗しました。処理を中断します。" "ERROR"
        Pause
        exit 1
    }
    
    # アプリケーション並列起動
    $AppResult = Start-ApplicationParallel
    if (-not $AppResult) {
        Write-Log "アプリケーションの起動に問題が発生しました" "WARN"
        Pause
        exit 1
    }
    
    # 起動完了メッセージを表示（魅力的なアニメーション風に）
    $frames = @(
        "起動中...",
        "起動中...*",
        "起動中...**",
        "起動中...***"
    )

    for ($i = 0; $i -lt 3; $i++) {
        foreach ($frame in $frames) {
            Write-Host "`r$frame" -NoNewline -ForegroundColor Cyan
            Start-Sleep -Milliseconds 120
        }
    }

    # 幅いっぱいのラインを表示
    $width = $Host.UI.RawUI.WindowSize.Width - 1
    $line = "─" * $width
    Write-Host "`r$line" -ForegroundColor Magenta

    # 秘書たんの可愛いメッセージ
    Write-Host "`n✨✨ ご主人様、秘書たんの起動が完了しました！ いつでもお呼びくださいね 💕 ✨✨`n" -ForegroundColor Magenta
    Write-Log "起動処理が完了しました ✨" "OK"

    # 詳細ログの場所を表示
    Write-Host ""
    Write-Host "🗒️ ログファイル：" -ForegroundColor Cyan
    Write-Host "  - 起動ログ: $StartupLogFile" -ForegroundColor Gray
    Write-Host "  - バックエンドログ: $BackendLogFile" -ForegroundColor Gray
    Write-Host "  - フロントエンドログ: $FrontendLogFile" -ForegroundColor Gray
    Write-Host ""
    
} catch {
    Write-Log "エラーが発生しました: $_" "ERROR"
    Write-Log $_.Exception.StackTrace "ERROR"
    Pause
    exit 1
} 