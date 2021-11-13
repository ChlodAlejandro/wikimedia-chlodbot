<?php
require __DIR__ . "/get_home_dir.php";

function get_log_files(): array {
    $logsPath = get_home_dir() . DIRECTORY_SEPARATOR . "logs";
    if (is_dir($logsPath)) {
        $logs = scandir($logsPath);
        return array_values(
            array_filter($logs, function ($fd) {
                return $fd[0] != ".";
            })
        );
    } else {
        return [];
    }
}
