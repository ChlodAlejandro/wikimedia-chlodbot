<?php
require __DIR__ . "/../../system/get_log_files.php";

if (in_array($_GET["file"], get_log_files())) {
    header("Content-Type: text/plain");

    $logsPath = __DIR__ . "/../../../../logs";
    $lines = explode("\n", file_get_contents(realpath($logsPath . DIRECTORY_SEPARATOR . $_GET["file"])));
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
