import sys

# パフォーマンス設定のデフォルト値
DEFAULT_FRAME_INTERVAL = 2.0  # 2秒間隔で画面取得（以前は4秒）
DEFAULT_RESIZE_FACTOR = 0.65  # 画像を65%に縮小（以前は50%）
DEFAULT_SKIP_RATIO = 1        # 毎回処理（スキップなし、以前は2回に1回）
DEFAULT_CPU_THRESHOLD = 80    # CPU使用率がこの値を超えると処理頻度を下げる

# コマンドライン引数から設定を取得
def get_performance_settings():
    # コマンドライン引数をパース
    args = sys.argv
    settings = {
        "frame_interval": DEFAULT_FRAME_INTERVAL,
        "resize_factor": DEFAULT_RESIZE_FACTOR,
        "skip_ratio": DEFAULT_SKIP_RATIO,
        "cpu_threshold": DEFAULT_CPU_THRESHOLD
    }
    
    # 引数からパフォーマンス設定を読み取る
    for i, arg in enumerate(args):
        if arg == "--frame-interval" and i + 1 < len(args):
            try:
                settings["frame_interval"] = float(args[i + 1])
            except ValueError:
                pass
        elif arg == "--resize-factor" and i + 1 < len(args):
            try:
                settings["resize_factor"] = float(args[i + 1])
            except ValueError:
                pass
        elif arg == "--skip-ratio" and i + 1 < len(args):
            try:
                settings["skip_ratio"] = int(args[i + 1])
            except ValueError:
                pass
        elif arg == "--cpu-threshold" and i + 1 < len(args):
            try:
                settings["cpu_threshold"] = float(args[i + 1])
            except ValueError:
                pass
        elif arg == "--performance-mode":
            # 高パフォーマンスモード（ゲームを優先）
            settings["frame_interval"] = 5.0
            settings["resize_factor"] = 0.4
            settings["skip_ratio"] = 3
            settings["cpu_threshold"] = 70
        elif arg == "--balanced-mode":
            # バランスモード
            settings["frame_interval"] = 3.0
            settings["resize_factor"] = 0.6
            settings["skip_ratio"] = 2
            settings["cpu_threshold"] = 80
        elif arg == "--detection-mode":
            # 検出優先モード
            settings["frame_interval"] = 2.0
            settings["resize_factor"] = 0.75
            settings["skip_ratio"] = 1
            settings["cpu_threshold"] = 90
    
    # 値の範囲を制限
    settings["frame_interval"] = max(1.0, min(10.0, settings["frame_interval"]))
    settings["resize_factor"] = max(0.2, min(1.0, settings["resize_factor"]))
    settings["skip_ratio"] = max(1, min(5, settings["skip_ratio"]))
    settings["cpu_threshold"] = max(50, min(95, settings["cpu_threshold"]))
    
    return settings

# パフォーマンス設定を取得
PERFORMANCE_SETTINGS = get_performance_settings()
