<?php
require __DIR__ . "/../../system/get_log_files.php";

header("Content-Type: application/json");
echo json_encode(get_log_files());
