Write-Host "🔍 秘書たん関連プロセス（詳細コマンド確認）"

$keywords = @("uvicorn", "hisyotan", "backend", "FastAPI", "multiprocessing", "spawn_main", "--multiprocessing-fork")

# すべてのプロセスを取得
$pythonProcs = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -like "*python*" -and $_.CommandLine -ne $null
}

# 条件に一致するプロセスを抽出
$targetProcs = @()

foreach ($proc in $pythonProcs) {
    foreach ($keyword in $keywords) {
        if ($keyword -and $proc.CommandLine.ToLower().Contains($keyword.ToLower())) {
            $targetProcs += $proc
            break
        }
    }
}

# プロセス終了処理
if ($targetProcs.Count -eq 0) {
    Write-Host "✔ Pythonプロセスに該当なし（クリーン）"
} else {
    foreach ($proc in $targetProcs) {
        Write-Host "❌ 該当プロセス検出: PID=$($proc.ProcessId) : $($proc.CommandLine)"
        try {
            Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
            Write-Host "✅ 終了しました"
        } catch {
            Write-Host "⚠️ 終了失敗: $_"
        }
    }
}
