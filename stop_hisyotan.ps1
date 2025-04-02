# stop_hisyotan.ps1
Write-Host "🔍 秘書たん関連のプロセスをチェック中..."

# チェック対象のプロセスとキーワード
$targets = @(
    @{ Name = "python"; Keyword = "uvicorn" },
    @{ Name = "python"; Keyword = "backend" },
    @{ Name = "node";   Keyword = "vite" },
    @{ Name = "electron"; Keyword = "hisyotan" }
)

foreach ($target in $targets) {
    $procList = Get-Process -Name $target.Name -ErrorAction SilentlyContinue | Where-Object {
        $_.Path -and $_.Path -like "*$($target.Keyword)*"
    }

    if ($procList.Count -gt 0) {
        Write-Host "❌ [$($target.Name)] $($target.Keyword) を含むプロセスが $($procList.Count) 件見つかりました。終了します..."
        foreach ($proc in $procList) {
            try {
                Stop-Process -Id $proc.Id -Force -ErrorAction Stop
                Write-Host "✅ プロセス (PID: $($proc.Id)) を終了しました"
            } catch {
                Write-Host "⚠️ 終了に失敗しました: $_"
            }
        }
    } else {
        Write-Host "✔ [$($target.Name)] $($target.Keyword) は実行中ではありません"
    }
}

Write-Host "🎉 終了処理完了！"
