<?php
if (isset($_GET["file"]))
    $file = $_GET["file"];
else if (substr($_SERVER["REQUEST_URI"], 0, 5) == "/dve/")
    $file = urldecode(preg_replace('/^\?file=/', '', substr($_SERVER["REQUEST_URI"], 5)));

if (!empty($file)) {
    $_GET["file"] = $file;
    require __DIR__ . "/utilities/discord-video-embed/get.php";
} else
    header("Location: /utilities/discord-video-embed/");
