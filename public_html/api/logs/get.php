<?php
require __DIR__ . "/../../system/get_log_files.php";
require __DIR__ . "/../../system/get_home_dir.php";

if (in_array($_GET["file"], get_log_files())) {
    header("Content-Type: text/plain");

    $logsPath = get_home_dir() . DIRECTORY_SEPARATOR . "logs";
    echo file_get_contents(realpath($logsPath . DIRECTORY_SEPARATOR . $_GET["file"]));
} else {
    http_response_code(400);
}
