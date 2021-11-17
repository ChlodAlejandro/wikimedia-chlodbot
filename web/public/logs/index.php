<?php
require_once(__DIR__ . "/../interface/head_global.php");
require_once(__DIR__ . "/../interface/body_header.php");

require_once(__DIR__ . "/../system/get_log_files.php");
?>
<!doctype html>
<html lang="en">
	<head>
		<title>Logs | Zoomiebot</title>
        <?php head_global(); ?>

		<!-- Page CSS -->
		<!--suppress CssUnusedSymbol -->
		<style>
			#logList .dropdown-item {
				cursor: pointer;
			}

			#log {
				white-space: pre;
				font-family: monospace;
				font-size: 0.8rem;

                overflow-x: auto;
				background-color: #111;
				color: white;
                width: 100%;
				height: calc(100vh - (74px + 56px));
			}
		</style>
		<script>
			window.logFiles = <?php echo json_encode(get_log_files()) ?>;
		</script>
	</head>
	<body>
		<?php body_header(); ?>
		<main>
			<nav class="navbar navbar-expand-l px-2" style="height: 56px;">
				<div class="container-fluid align-items-center justify-content-start">
					<span class="navbar-brand">Log viewer</span>
					<div class="nav-item dropdown">
						<a class="nav-link dropdown-toggle" href="#" id="activeLog" role="button"
						   data-bs-toggle="dropdown" aria-expanded="false">
							Select a log file
						</a>
						<ul id="logList" class="dropdown-menu" aria-labelledby="activeLog"></ul>
					</div>
					<button class="btn btn-outline-dark">
						<i id="refresh" class="bi bi-arrow-clockwise"></i>
					</button>
				</div>
			</nav>
			<div id="log" class="container-fluid py-2"><!--
				--><span style="color: gray; font-style: italic">Select a log file...</span><!--
			--></div>
		</main>
		<script src="/scripts/auto/logs.js"></script>
	</body>
</html>
