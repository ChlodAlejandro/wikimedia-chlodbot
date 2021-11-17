<?php
function get_log_files(): array {
    $logsPath = __DIR__ . "/logs/";
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

function get_log_file($name): ?string {
    if (in_array($name, get_log_files())) {
        $path = realpath(__DIR__ . "/logs/" . $name);
        if (!$path)
            return null;
        return file_get_contents($path);
    }
    return null;
}
