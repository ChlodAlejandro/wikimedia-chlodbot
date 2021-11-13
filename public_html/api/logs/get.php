<?php
require __DIR__ . "/../../system/get_log_files.php";

if (in_array($_GET["file"], get_log_files())) {
    header("Content-Type: text/plain");

    $logsPath = __DIR__ . "/../../../../logs";
    echo file_get_contents(realpath($logsPath . DIRECTORY_SEPARATOR . $_GET["file"]));
} else {
    http_response_code(400);
}
