﻿[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Write-Host "🔍 秘書たんプロセスだけを優しく終了するよ..."

# プロセス情報ファイルのパス
$procInfoFile = "$env:TEMP\hisyotan_processes.json"
$vitePidFile = "$env:TEMP\hisyotan_vite_pid.txt"
$viteInfoFile = "$env:TEMP\hisyotan_vite_info.json"

# Pythonプロセスをエラーなく終了させるためには、
# まずSIGINT（Ctrl+C相当）を送ってから、必要に応じてKillする
function Stop-ProcessGracefully {
    param(
        [Parameter(Mandatory=$true)]
        [int]$ProcessId,
        [string]$ProcessName = "不明",
        [bool]$TryGraceful = $true
    )
    
    try {
        $proc = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
        if ($proc) {
            # uvicornプロセスを特別扱い
            if ($proc.Name -match "python" -and $TryGraceful) {
                Write-Host "   💫 $ProcessName プロセス (PID: $ProcessId) をCtrl+Cで優しく終了を試みるよ"
                
                # SIGINT (Ctrl+C) を送信する - uvicornに対してはこれが最適
                $closeResult = Add-Type -AssemblyName System.Windows.Forms -PassThru
                try {
                    [void][System.Windows.Forms.SendKeys]::SendWait("^C")
                    Start-Sleep -Milliseconds 500
                    
                    # プロセスがまだ生きているか確認
                    $procCheck = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
                    if (-not $procCheck) {
                        Write-Host "   ✨ $ProcessName プロセス (PID: $ProcessId) は正常終了したよ"
                        return $true
                    }
                } catch {
                    Write-Host "   💭 SendKeys失敗、別の方法を試すね: $_"
                }
            }
            
            # SIGTERM (通常終了) を試す
            Write-Host "   🧸 $ProcessName プロセス (PID: $ProcessId) を通常終了させるよ"
            $proc.CloseMainWindow() | Out-Null
            if (!$proc.HasExited) {
                Start-Sleep -Milliseconds 500
                if (!$proc.HasExited) {
                    # それでも終了しなければ強制終了
                    Write-Host "   🔪 $ProcessName プロセス (PID: $ProcessId) を強制終了するよ"
                    Stop-Process -Id $ProcessId -Force -ErrorAction Stop
                }
            }
            Write-Host "   ✅ $ProcessName プロセス (PID: $ProcessId) を終了したよ"
            return $true
        } else {
            Write-Host "   ℹ️ $ProcessName プロセス (PID: $ProcessId) はもう存在しないみたい"
            return $false
        }
    } catch {
        Write-Host "   ⚠️ $ProcessName プロセス (PID: $ProcessId) の終了に失敗したの... $_"
        return $false
    }
}

# プロセスツリーを終了する関数
function Stop-ProcessTree {
    param(
        [Parameter(Mandatory=$true)]
        [int]$ProcessId,
        [string]$ProcessName = "不明"
    )
    
    try {
        # WMIを使用して子プロセスを検索
        $childProcesses = Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $ProcessId }
        
        # 子プロセスがある場合、再帰的に終了
        if ($childProcesses.Count -gt 0) {
            Write-Host "   🌱 $ProcessName プロセスには $($childProcesses.Count) 個の子プロセスがあるよ"
            foreach ($childProcess in $childProcesses) {
                Stop-ProcessTree -ProcessId $childProcess.ProcessId -ProcessName "$($childProcess.Name) (子プロセス)"
            }
        }
        
        # 親プロセスを終了
        $isPython = $ProcessName -match "python"
        $isUvicorn = $ProcessName -match "uvicorn" -or $ProcessName -match "fastapi"
        
        # Python/uvicornプロセスは特別扱い
        if ($isPython -or $isUvicorn) {
            return Stop-ProcessGracefully -ProcessId $ProcessId -ProcessName $ProcessName -TryGraceful $true
        } else {
            return Stop-ProcessGracefully -ProcessId $ProcessId -ProcessName $ProcessName -TryGraceful $false
        }
    } catch {
        Write-Host "   ⚠️ $ProcessName プロセス (PID: $ProcessId) の終了に失敗したの... $_"
        return $false
    }
}

# JSONプロセス情報からの終了処理
$processesTerminated = 0
if (Test-Path $procInfoFile) {
    try {
        # JSONファイルからプロセス情報を読み込む
        $procInfo = Get-Content $procInfoFile -Raw | ConvertFrom-Json
        
        # 起動日時の表示
        Write-Host "📅 起動日時: $($procInfo.StartTime)"
        
        # 各プロセスIDを確認して終了
        @("Backend", "Vite", "Electron") | ForEach-Object {
            $procType = $_
            $VitePID = $procInfo.$procType
            
            if ($VitePID -ne $null) {
                try {
                    $proc = Get-Process -Id $VitePID -ErrorAction SilentlyContinue
                    if ($proc) {
                        Write-Host "`n🧹 終了対象: $procType"
                        Write-Host "   PID: $VitePID"
                        Write-Host "   ファイル: $($proc.Name)"
                        
                        # プロセスツリー終了関数を使用
                        $success = Stop-ProcessTree -ProcessId $VitePID -ProcessName $procType
                        if ($success) {
                            $processesTerminated++
                        }
                    } else {
                        Write-Host "ℹ️ $procType プロセス (PID: $VitePID) はもう存在しないみたい"
                    }
                } catch {
                    Write-Host "⚠️ $procType プロセス (PID: $VitePID) の終了に失敗したの... $_"
                }
            }
        }
        
        # JSONファイルを削除
        Remove-Item $procInfoFile -Force -ErrorAction SilentlyContinue
        Write-Host "🧹 プロセス管理情報を削除したよ"
    } catch {
        Write-Host "⚠️ プロセス情報の解析中にエラーが発生したの... $_"
    }
}

# Vite専用PIDファイルの確認と処理
if (Test-Path $vitePidFile) {
    try {
        $vitePid = Get-Content $vitePidFile
        $proc = Get-Process -Id $vitePid -ErrorAction SilentlyContinue
        
        if ($proc) {
            Write-Host "`n🧹 終了対象: Vite (PIDファイル)"
            Write-Host "   PID: $vitePid"
            Write-Host "   ファイル: $($proc.Name)"
            
            # プロセスツリー終了関数を使用
            $success = Stop-ProcessTree -ProcessId $vitePid -ProcessName "Vite"
            if ($success) {
                $processesTerminated++
            }
        }
        
        # PIDファイルを削除
        Remove-Item $vitePidFile -Force -ErrorAction SilentlyContinue
        Write-Host "🧹 Vite PIDファイルを削除したよ"
    } catch {
        Write-Host "⚠️ Vite PID処理中にエラーが発生したの... $_"
    }
}

# Vite詳細情報ファイルの確認と処理
if (Test-Path $viteInfoFile) {
    try {
        # JSONファイルから詳細情報を読み込む
        $viteInfo = Get-Content $viteInfoFile -Raw | ConvertFrom-Json
        
        if ($viteInfo.PID -ne $null) {
            $proc = Get-Process -Id $viteInfo.PID -ErrorAction SilentlyContinue
            
            if ($proc) {
                Write-Host "`n🧹 終了対象: Vite (詳細情報)"
                Write-Host "   PID: $($viteInfo.PID)"
                Write-Host "   ファイル: $($proc.Name)"
                Write-Host "   起動時刻: $($viteInfo.StartTime)"
                Write-Host "   ウィンドウタイトル: $($viteInfo.WindowTitle)"
                
                # プロセスツリー終了関数を使用
                $success = Stop-ProcessTree -ProcessId $viteInfo.PID -ProcessName "Vite"
                if ($success) {
                    $processesTerminated++
                }
            }
        }
        
        # 詳細情報ファイルを削除
        Remove-Item $viteInfoFile -Force -ErrorAction SilentlyContinue
        Write-Host "🧹 Vite詳細情報ファイルを削除したよ"
    } catch {
        Write-Host "⚠️ Vite詳細情報処理中にエラーが発生したの... $_"
    }
}

# タイトルに「hisyotan_vite」を持つプロセスを検索
$targetProcsVite = Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -ne $null -and
    $_.CommandLine.ToLower().Contains("title hisyotan_vite")
}

# ウィンドウタイトルでの検索 (WMIメソッドを使用)
$titleProcs = @()
try {
    # ウィンドウタイトルでのプロセス検索（FindWindowで検索）
    Add-Type @"
    using System;
    using System.Runtime.InteropServices;
    public class WindowUtils {
        [DllImport("user32.dll", SetLastError = true)]
        public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
        
        [DllImport("user32.dll", SetLastError = true)]
        public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    }
"@

    # hisyotan_viteというタイトルのウィンドウを検索
    $hWnd = [WindowUtils]::FindWindow($null, "hisyotan_vite")
    if ($hWnd -ne [IntPtr]::Zero) {
        $processId = 0
        [void][WindowUtils]::GetWindowThreadProcessId($hWnd, [ref]$processId)
        if ($processId -gt 0) {
            Write-Host "🔍 ウィンドウタイトル「hisyotan_vite」のプロセスを見つけたよ (PID: $processId)"
            $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($proc) {
                $titleProcs += Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -eq $processId }
            }
        }
    }
} catch {
    Write-Host "⚠️ ウィンドウタイトルによる検索でエラーが発生したの... $_"
}

# キーワード検索
$keywords = @(
    "hisyotan",
    "uvicorn",
    "frontend/src/main/index.js",
    "frontend/src/main/preload/preload.js",
    "frontend/src/main/preload/paw-preload.js",
    "dist/preload.js",
    "dist/paw-preload.js"
)

# Python.exeおよびuvicornプロセスを検索して終了
$pythonProcs = Get-Process -Name "python" -ErrorAction SilentlyContinue
foreach ($pythonProc in $pythonProcs) {
    try {
        $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($pythonProc.Id)").CommandLine
        if ($cmdLine -match "uvicorn" -or $cmdLine -match "fastapi") {
            Write-Host "`n🧹 終了対象: uvicorn/fastapi (Python)"
            Write-Host "   PID: $($pythonProc.Id)"
            Write-Host "   コマンド: $cmdLine"
            
            # uvicorn/FastAPIプロセスを優しく終了
            $success = Stop-ProcessGracefully -ProcessId $pythonProc.Id -ProcessName "uvicorn (Python)" -TryGraceful $true
            if ($success) {
                $processesTerminated++
            }
        }
    } catch {
        Write-Host "⚠️ Pythonプロセス解析エラー: $_"
    }
}

# キーワード検索による終了処理
$targetProcs = @()
foreach ($keyword in $keywords) {
    $keywordProcs = Get-CimInstance Win32_Process | Where-Object {
        $_.CommandLine -ne $null -and
        $_.CommandLine.ToLower().Contains($keyword.ToLower())
    }
    $targetProcs += $keywordProcs
}

# キーワード検索結果の重複を除去
$targetProcs = $targetProcs | Select-Object -Unique ProcessId, Name, CommandLine

# 検索結果に基づく終了処理
if ($targetProcs.Count -eq 0) {
    if ($processesTerminated -eq 0) {
        Write-Host "`n✨ クリーンだよ！秘書たんはもういないの"
    } else {
        Write-Host "`n🎀 登録プロセスをすべて終了したよ！"
    }
} else {
    Write-Host "`n🔍 キーワード検索で追加のプロセスを見つけたの..."
    foreach ($proc in $targetProcs) {
        Write-Host "`n🧹 終了対象: (キーワード検索)"
        Write-Host "   PID: $($proc.ProcessId)"
        Write-Host "   ファイル: $($proc.Name)"
        Write-Host "   コマンド: $($proc.CommandLine)"
        try {
            # プロセスツリー終了関数を使用
            $success = Stop-ProcessTree -ProcessId $proc.ProcessId -ProcessName "$($proc.Name) (キーワード検出)"
            if ($success) {
                $processesTerminated++
            }
        } catch {
            Write-Host "⚠️ 終了できなかった... $_"
        }
    }
}

Write-Host "`n🐱 合計 $processesTerminated 個のプロセスを終了したよ！"

# 正常終了を返す
exit 0
