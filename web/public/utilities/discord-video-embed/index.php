<?php
require_once(__DIR__ . "/../../interface/head_global.php");
require_once(__DIR__ . "/../../interface/body_header.php");

$zbMetadata = [
    "title" => "Utilities",
    "description" => "Simple web-based utilities for Wikipedia pages.",
];

if (strpos($_SERVER["HTTP_USER_AGENT"], "Discordbot") !== false) {
    header("Location: /dve.php?" . $_SERVER["QUERY_STRING"]);
	exit(0);
}
?>
<!doctype html>
<html lang="en">
    <head>
        <?php head_global(); ?>
        <!-- Page CSS -->
		<style>
            .no-video {
				display: none;
			}
            #targetVideo {
                display: block;
				width: 100%;
                max-width: 600px;
				margin: auto;
			}
		</style>
        <!--suppress CssUnusedSymbol -->
    </head>
    <body>
        <?php body_header(); ?>
        <main>
            <div class="container">
                <div class="p-5 mb-4 bg-light rounded-3">
                    <h1 class="display-4 fw-bold">Commons Discord Video Embed</h1>
                    <p>Find the right URL to use to embed a video from Wikimedia Commons.</p>
                    <p>
                        Deeper explanation: Wikimedia Commons provides video in two file formats: VP9
                        and WebM. Both of these formats can be embedded on Discord with one condition: the
                        files must be below 50 MB in size. This utility determines the best-suited file
                        for the job (the highest resolution video within 50 MiB).
                    </p>
                    <form id="videoForm">
                        <label class="form-label" for="file">File title</label>
                        <div class="mb-2 d-flex">
                            <input
                                class="form-control"
                                type="text"
                                aria-describedby="file"
                                name="file"
                                value="<?= htmlspecialchars($_GET["file"] ?? ""); ?>"
                                placeholder="File:Northern shovelers spinning in Prospect Park.webm"
                                required
                            >
                            <input
                                class="form-control btn-primary ms-2 w-auto flex-grow-0"
								name="submit"
                                type="submit"
                                value="Find"
                            >
                        </div>
                    </form>
					<div class="no-video">
						<div><b>DVE Link:</b> <a id="targetVideoDveUrl"></a></div>
						<div><b>Actual Link:</b> <a id="targetVideoUrl"></a></div>
						<video class="mt-3" id="targetVideo" autoplay controls></video>
					</div>
                </div>
            </div>
        </main>
		<script>loadJS("discord-video-embed");</script>
    </body>
</html>
