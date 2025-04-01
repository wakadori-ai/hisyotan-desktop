# 7DTD秘書たん診断スクリプト
# 必要なファイルとポート状況を確認します
# 作成日: 2023年12月31日

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

# ディレクトリ設定
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppName = "7DTD秘書たん"
$BackendDir = Join-Path $ScriptDir "backend"
$FrontendDir = $ScriptDir
$DataDir = Join-Path $BackendDir "data"
$AssetsDir = Join-Path $ScriptDir "assets"
$ImagesDir = Join-Path $AssetsDir "images"
$LogDir = Join-Path $ScriptDir "logs"

# 結果カウント
$TotalChecks = 0
$PassedChecks = 0
$WarningChecks = 0
$FailedChecks = 0

# ログファイルの設定
$DiagLogFile = Join-Path $LogDir "diagnose_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"

# ログディレクトリの作成
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
    │     7DTD秘書たん - 診断ツール 🔍              │
    │           v1.0.0                           │
    │                                             │
    │          健康診断をするね♪                    │
    │         ∧＿∧                                │
    │        ( •ω• )  ♪                           │
    │      /⌒ ＿＿ ＼                              │
    │     /    /￣￣/|                             │
    │     |  O |  O |/                            │
    │                                             │
    ╰─────────────────────────────────────────────╯
    
"@
    Write-Host $logo -ForegroundColor Magenta
}

# ログ出力関数
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogMessage = "$Timestamp [$Level] $Message"
    
    # コンソールの色を設定
    $color = switch ($Level) {
        "INFO"  { "White" }
        "WARN"  { "Yellow" }
        "ERROR" { "Red" }
        "OK"    { "Green" }
        default { "Gray" }
    }
    
    Write-Host $LogMessage -ForegroundColor $color
    Add-Content -Path $DiagLogFile -Value $LogMessage
}

# チェック結果を表示する関数
function Write-CheckResult {
    param(
        [string]$Name,
        [string]$Status,
        [string]$Description = ""
    )
    
    $TotalChecks++
    
    switch ($Status) {
        "PASS" { 
            $PassedChecks++
            $statusIcon = "✅"
            $color = "Green" 
        }
        "WARN" { 
            $WarningChecks++
            $statusIcon = "⚠️"
            $color = "Yellow" 
        }
        "FAIL" { 
            $FailedChecks++
            $statusIcon = "❌"
            $color = "Red" 
        }
        default { 
            $statusIcon = "ℹ️"
            $color = "White" 
        }
    }
    
    Write-Host "$statusIcon $Name" -ForegroundColor $color
    
    if ($Description) {
        Write-Host "   $Description" -ForegroundColor Gray
    }
    
    # ログにも記録
    $logMessage = "$Name - $Status"
    if ($Description) {
        $logMessage = "$logMessage`: $Description"
    }
    Write-Log $logMessage
}

# 必須ディレクトリをチェックする関数
function Test-RequiredDirectories {
    Write-Host "`n📁 必須ディレクトリの確認..." -ForegroundColor Cyan
    
    $requiredDirs = @(
        @{Path = $BackendDir; Name = "バックエンドディレクトリ"; Required = $true},
        @{Path = $DataDir; Name = "データディレクトリ"; Required = $true},
        @{Path = $AssetsDir; Name = "アセットディレクトリ"; Required = $true},
        @{Path = $ImagesDir; Name = "画像ディレクトリ"; Required = $true},
        @{Path = (Join-Path $DataDir "temp"); Name = "一時ファイルディレクトリ"; Required = $false},
        @{Path = (Join-Path $DataDir "static"); Name = "静的ファイルディレクトリ"; Required = $false},
        @{Path = (Join-Path $DataDir "dialogues"); Name = "ダイアログディレクトリ"; Required = $false}
    )
    
    foreach ($dir in $requiredDirs) {
        if (Test-Path $dir.Path) {
            Write-CheckResult -Name $dir.Name -Status "PASS" -Description "パス: $($dir.Path)"
        } else {
            if ($dir.Required) {
                Write-CheckResult -Name $dir.Name -Status "FAIL" -Description "必須ディレクトリ '$($dir.Path)' が見つかりません"
            } else {
                Write-CheckResult -Name $dir.Name -Status "WARN" -Description "ディレクトリ '$($dir.Path)' が見つかりません。起動時に自動作成されます"
            }
        }
    }
}

# 必須ファイルをチェックする関数
function Test-RequiredFiles {
    Write-Host "`n📄 必須ファイルの確認..." -ForegroundColor Cyan
    
    $requiredFiles = @(
        @{Path = (Join-Path $FrontendDir "main.js"); Name = "Electronエントリーポイント"; Required = $true},
        @{Path = (Join-Path $BackendDir "main.py"); Name = "FastAPIエントリーポイント (main.py)"; Required = $false},
        @{Path = (Join-Path $BackendDir "app.py"); Name = "FastAPIエントリーポイント (app.py)"; Required = $false},
        @{Path = (Join-Path $FrontendDir "package.json"); Name = "package.json"; Required = $true},
        @{Path = (Join-Path $FrontendDir "requirements.txt"); Name = "Python依存関係ファイル"; Required = $true}
    )
    
    # FastAPIエントリーポイントの特別チェック
    $backendEntryFound = $false
    
    foreach ($file in $requiredFiles) {
        if (Test-Path $file.Path) {
            Write-CheckResult -Name $file.Name -Status "PASS" -Description "パス: $($file.Path)"
            
            # FastAPIエントリーポイントが見つかった場合
            if ($file.Path -match "main\.py|app\.py") {
                $backendEntryFound = $true
            }
        } else {
            if ($file.Required) {
                Write-CheckResult -Name $file.Name -Status "FAIL" -Description "必須ファイル '$($file.Path)' が見つかりません"
            } else {
                # main.pyとapp.pyのどちらかが必要
                if ($file.Path -match "main\.py|app\.py" -and -not $backendEntryFound) {
                    Write-CheckResult -Name $file.Name -Status "WARN" -Description "ファイル '$($file.Path)' が見つかりません"
                } else {
                    Write-CheckResult -Name $file.Name -Status "WARN" -Description "ファイル '$($file.Path)' が見つかりません"
                }
            }
        }
    }
    
    # FastAPIのエントリーポイントが見つからない場合は特別な警告
    if (-not $backendEntryFound) {
        Write-CheckResult -Name "FastAPIエントリーポイント" -Status "FAIL" -Description "main.pyまたはapp.pyが見つかりません。バックエンドが起動できません"
    }
    
    # 表情画像ファイルの確認
    $requiredEmotions = @("normal", "happy", "sad", "angry", "surprised", "soft")
    $missingEmotions = @()
    
    foreach ($emotion in $requiredEmotions) {
        $emotionFile = Join-Path $ImagesDir "secretary_${emotion}.png"
        if (-not (Test-Path $emotionFile)) {
            $missingEmotions += $emotion
        }
    }
    
    if ($missingEmotions.Count -gt 0) {
        Write-CheckResult -Name "表情画像ファイル" -Status "WARN" -Description "以下の表情ファイルが見つかりません: $($missingEmotions -join ', ')"
    } else {
        Write-CheckResult -Name "表情画像ファイル" -Status "PASS" -Description "すべての表情アセットが確認できました"
    }
}

# 依存関係をチェックする関数
function Test-Dependencies {
    Write-Host "`n🔧 依存関係の確認..." -ForegroundColor Cyan
    
    # Pythonのチェック
    try {
        $pythonVersion = python --version 2>&1
        if ($pythonVersion -match "Python 3\.[8-9]|3\.1[0-9]") {
            Write-CheckResult -Name "Python" -Status "PASS" -Description "$pythonVersion"
        } else {
            Write-CheckResult -Name "Python" -Status "WARN" -Description "Python 3.8以上が必要です。現在のバージョン: $pythonVersion"
        }
    } catch {
        Write-CheckResult -Name "Python" -Status "FAIL" -Description "Pythonが見つかりません。インストールしてください"
    }
    
    # Nodeのチェック
    try {
        $nodeVersion = node --version
        Write-CheckResult -Name "Node.js" -Status "PASS" -Description "バージョン: $nodeVersion"
    } catch {
        Write-CheckResult -Name "Node.js" -Status "FAIL" -Description "Node.jsが見つかりません。インストールしてください"
    }
    
    # NPMのチェック
    try {
        $npmVersion = npm --version
        Write-CheckResult -Name "npm" -Status "PASS" -Description "バージョン: $npmVersion"
    } catch {
        Write-CheckResult -Name "npm" -Status "FAIL" -Description "npmが見つかりません。Node.jsを再インストールしてください"
    }
    
    # Python仮想環境のチェック
    $VenvPath = Join-Path $BackendDir ".venv"
    $PythonExe = Join-Path $VenvPath "Scripts\python.exe"
    
    if (Test-Path $PythonExe) {
        try {
            $venvPythonVersion = & $PythonExe --version 2>&1
            Write-CheckResult -Name "Python仮想環境" -Status "PASS" -Description "$venvPythonVersion (パス: $VenvPath)"
        } catch {
            Write-CheckResult -Name "Python仮想環境" -Status "WARN" -Description "仮想環境は存在しますが、Pythonの実行に失敗しました"
        }
    } else {
        Write-CheckResult -Name "Python仮想環境" -Status "WARN" -Description "仮想環境が見つかりません。初回起動時に自動作成されます"
    }
    
    # VOICEVOXのチェック
    $voicevoxPaths = @(
        "C:\Program Files\VOICEVOX\vv-engine\run.exe",
        "C:\Users\$env:USERNAME\AppData\Local\Programs\VOICEVOX\vv-engine\run.exe",
        "C:\Users\wakad\AppData\Local\Programs\VOICEVOX\vv-engine\run.exe"
    )
    
    $voicevoxFound = $false
    $voicevoxPath = ""
    
    foreach ($path in $voicevoxPaths) {
        if (Test-Path $path) {
            $voicevoxFound = $true
            $voicevoxPath = $path
            break
        }
    }
    
    if ($voicevoxFound) {
        Write-CheckResult -Name "VOICEVOX" -Status "PASS" -Description "パス: $voicevoxPath"
    } else {
        Write-CheckResult -Name "VOICEVOX" -Status "WARN" -Description "VOICEVOXが見つかりません。音声機能が使用できない可能性があります"
    }
}

# ポート状況をチェックする関数
function Test-Ports {
    Write-Host "`n🌐 ポート状況の確認..." -ForegroundColor Cyan
    
    $portsToCheck = @(
        @{Port = 8000; Name = "FastAPI バックエンド"; Critical = $true},
        @{Port = 3000; Name = "Electron 開発サーバー"; Critical = $false},
        @{Port = 50021; Name = "VOICEVOX エンジン"; Critical = $false}
    )
    
    foreach ($portInfo in $portsToCheck) {
        $port = $portInfo.Port
        $portName = $portInfo.Name
        $isCritical = $portInfo.Critical
        
        try {
            $tcpConnections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
            
            if ($tcpConnections) {
                $processIds = $tcpConnections | ForEach-Object { $_.OwningProcess } | Select-Object -Unique
                $processes = $processIds | ForEach-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue }
                $processNames = $processes | ForEach-Object { $_.ProcessName }
                
                $processInfo = $processNames -join ", "
                
                Write-CheckResult -Name "ポート $port ($portName)" -Status "WARN" -Description "既に使用されています: $processInfo (PID: $($processIds -join ', '))"
            } else {
                Write-CheckResult -Name "ポート $port ($portName)" -Status "PASS" -Description "利用可能"
            }
        } catch {
            if ($isCritical) {
                Write-CheckResult -Name "ポート $port ($portName)" -Status "FAIL" -Description "ポート状態の確認に失敗しました: $_"
            } else {
                Write-CheckResult -Name "ポート $port ($portName)" -Status "WARN" -Description "ポート状態の確認に失敗しました: $_"
            }
        }
    }
}

# プロセス状況をチェックする関数
function Test-Processes {
    Write-Host "`n⚙️ プロセス状況の確認..." -ForegroundColor Cyan
    
    $processesToCheck = @(
        @{Name = "node"; Display = "Node.js/Electron"; Critical = $false},
        @{Name = "python"; Display = "Python/FastAPI"; Critical = $false},
        @{Name = "run"; Display = "VOICEVOX エンジン"; Critical = $false}
    )
    
    foreach ($processInfo in $processesToCheck) {
        $processName = $processInfo.Name
        $displayName = $processInfo.Display
        $isCritical = $processInfo.Critical
        
        try {
            $processes = Get-Process -Name $processName -ErrorAction SilentlyContinue
            
            if ($processes) {
                $count = $processes.Count
                $info = ""
                
                if ($count -le 3) {
                    $info = $processes | ForEach-Object { "(PID: $($_.Id), メモリ: $([math]::Round($_.WorkingSet / 1MB, 2)) MB)" } | Join-String -Separator ", "
                } else {
                    $info = "実行中のプロセス数: $count"
                }
                
                Write-CheckResult -Name "$displayName プロセス" -Status "WARN" -Description "既に実行中です: $info"
            } else {
                Write-CheckResult -Name "$displayName プロセス" -Status "PASS" -Description "実行されていません"
            }
        } catch {
            if ($isCritical) {
                Write-CheckResult -Name "$displayName プロセス" -Status "FAIL" -Description "プロセス状態の確認に失敗しました: $_"
            } else {
                Write-CheckResult -Name "$displayName プロセス" -Status "WARN" -Description "プロセス状態の確認に失敗しました: $_"
            }
        }
    }
}

# ディスク容量をチェックする関数
function Test-DiskSpace {
    Write-Host "`n💾 ディスク容量の確認..." -ForegroundColor Cyan
    
    $drive = Split-Path -Qualifier $ScriptDir
    
    try {
        $volume = Get-Volume -DriveLetter ($drive -replace ':', '')
        $freeSpaceGB = [math]::Round($volume.SizeRemaining / 1GB, 2)
        $totalSpaceGB = [math]::Round($volume.Size / 1GB, 2)
        $freePercentage = [math]::Round(($volume.SizeRemaining / $volume.Size) * 100, 2)
        
        if ($freeSpaceGB -lt 1) {
            Write-CheckResult -Name "ディスク容量" -Status "FAIL" -Description "ドライブ $drive の空き容量が非常に少なくなっています: $freeSpaceGB GB ($freePercentage%)"
        } elseif ($freeSpaceGB -lt 5) {
            Write-CheckResult -Name "ディスク容量" -Status "WARN" -Description "ドライブ $drive の空き容量が少なくなっています: $freeSpaceGB GB / $totalSpaceGB GB ($freePercentage%)"
        } else {
            Write-CheckResult -Name "ディスク容量" -Status "PASS" -Description "ドライブ $drive の空き容量: $freeSpaceGB GB / $totalSpaceGB GB ($freePercentage%)"
        }
    } catch {
        Write-CheckResult -Name "ディスク容量" -Status "WARN" -Description "ディスク容量の確認に失敗しました: $_"
    }
}

# 診断サマリーを表示する関数
function Show-DiagnosisSummary {
    Write-Host "`n📊 診断結果まとめ" -ForegroundColor Cyan
    
    # かわいいデコレーション
    $width = $Host.UI.RawUI.WindowSize.Width - 1
    $line = "♡" * ($width / 2)
    Write-Host $line -ForegroundColor Magenta
    
    Write-Host "総チェック数: $TotalChecks 項目" -ForegroundColor White
    Write-Host "✅ うまくいったこと: $PassedChecks 項目" -ForegroundColor Green
    Write-Host "⚠️ 注意したほうがいいこと: $WarningChecks 項目" -ForegroundColor Yellow
    Write-Host "❌ 問題があること: $FailedChecks 項目" -ForegroundColor Red
    
    Write-Host $line -ForegroundColor Magenta
    
    if ($FailedChecks -gt 0) {
        Write-Host "`n❌ 重大な問題があります…解決しないと秘書たん起動できないかも…" -ForegroundColor Red
        Write-Host "   うえの赤いメッセージを確認してね…" -ForegroundColor Red
    } elseif ($WarningChecks -gt 0) {
        Write-Host "`n⚠️ いくつか警告があるよ。できれば直したほうがいいけど…" -ForegroundColor Yellow
        Write-Host "   基本的な機能は動くと思うから、様子を見てみてね！" -ForegroundColor Yellow
    } else {
        Write-Host "`n✨ 全部のチェックがOKだよ！秘書たんはバッチリ起動できるよ〜！" -ForegroundColor Green
        Write-Host "   さっそく起動してみてね♪" -ForegroundColor Green
    }
    
    # ログファイルのパスを表示
    Write-Host "`n📝 詳しいログはここに残しておいたよ: $DiagLogFile" -ForegroundColor Cyan
}

# メイン処理
try {
    Show-Logo
    Write-Log "$AppName 診断ツールを開始します 🔍"
    
    # 各種チェックを実行
    Test-RequiredDirectories
    Test-RequiredFiles
    Test-Dependencies
    Test-Ports
    Test-Processes
    Test-DiskSpace
    
    # 診断サマリーを表示
    Show-DiagnosisSummary
    
    Write-Log "診断が完了しました ✨" "OK"
} catch {
    Write-Log "診断中にエラーが発生しました: $_" "ERROR"
    Write-Log $_.Exception.StackTrace "ERROR"
    Write-Host "`n❌ 診断中にエラーが発生しました: $_" -ForegroundColor Red
}

# 終了確認
Write-Host "`n終了するには何かキーを押してください..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 