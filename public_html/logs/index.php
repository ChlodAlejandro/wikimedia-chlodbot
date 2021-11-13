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
		<script src="/scripts/auto/exports.js"></script>
	</head>
	<body>
		<?php body_header(); ?>
		<main>
			<nav class="navbar navbar-expand-l px-2" style="height: 56px;">
				<div class="container-fluid align-items-center justify-content-start">
					<span class="navbar-brand">Log viewer</span>
					<div class="nav-item dropdown me-lg-auto">
						<a class="nav-link dropdown-toggle" href="#" id="activeLog" role="button"
						   data-bs-toggle="dropdown" aria-expanded="false">
							Select a log file
						</a>
						<ul id="logList" class="dropdown-menu" aria-labelledby="activeLog"></ul>
					</div>
					<div>Logs go bottom to top.</div>
				</div>
			</nav>
			<div id="log" class="container-fluid">

			</div>
		</main>
		<!--suppress JSUnusedAssignment -->
		<script>
			const logList = document.getElementById("logList");
            logList.innerHTML = "";

            function setLogFile(file) {
                document.getElementById("activeLog").innerText = file;
                fetch(`/api/logs/get.php?file=${encodeURIComponent(file)}`)
					.then(r => r.text())
					.then(t => (new (require("ansi-to-html"))).toHtml(t))
					.then(t => {
                        document.getElementById("log").innerHTML = t;
					})
			}

            for (const log of <?php echo json_encode(get_log_files()) ?>) {
                if (log == null) continue;

                const li = document.createElement("li");
                const li_a = document.createElement("li");
                li_a.innerText = log;
                li_a.classList.add("dropdown-item");
                li_a.addEventListener("click", () => {
                    setLogFile(log);
				});
                li.appendChild(li_a);
                logList.appendChild(li);
			}
		</script>
	</body>
</html>
