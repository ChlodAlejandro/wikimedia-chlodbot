<?php
$file = $_GET["file"] ?? substr($_SERVER["REQUEST_URI"], 5);

if (!empty($file))
    header("Location: /utilities/discord-video-embed/get.php?file=$file");
else
    header("Location: /utilities/discord-video-embed/");
