<?php
require __DIR__ . "/../../system/get_log_files.php";

if (in_array($_GET["file"], get_log_files())) {
    $logFile = get_log_file($_GET["file"]);
    if ($logFile == null) {
        http_response_code(400);
    }
    $lines = explode("\n", str_replace("\r\n", "\n", $logFile));
    foreach (array_slice(
        $lines,
        count($lines) - (100),
        100
    ) as $line) {
       echo $line . PHP_EOL;
    }
} else {
    http_response_code(400);
}
