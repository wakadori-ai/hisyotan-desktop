[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Write-Host "🔍 秘書たんプロセスだけを優しく終了するよ..."

# 「hisyotan」系のプロセスだけに限定（CommandLineが必要）
$keyword = "hisyotan"

$targetProcs = Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -ne $null -and
    $_.CommandLine.ToLower().Contains($keyword)
}

# 終了処理
if ($targetProcs.Count -eq 0) {
    Write-Host "✔ クリーンだよ！秘書たんはもういないの"
} else {
    foreach ($proc in $targetProcs) {
        Write-Host "`n🧹 終了対象:"
        Write-Host "   PID: $($proc.ProcessId)"
        Write-Host "   ファイル: $($proc.Name)"
        Write-Host "   コマンド: $($proc.CommandLine)"
        try {
            Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
            Write-Host "✅ ちゃんと終了できたよ〜"
        } catch {
            Write-Host "⚠️ 終了できなかった... $_"
        }
    }
}
