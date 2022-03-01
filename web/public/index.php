<?php
require_once(__DIR__ . "/interface/head_global.php");
require_once(__DIR__ . "/interface/body_header.php");
?>
<!doctype html>
<html lang="en">
	<head>
        <?php head_global(); ?>

		<!-- Page CSS -->
		<!--suppress CssUnusedSymbol -->
		<style>
			#tasks {
				overflow-x: auto;
			}

			#tasks:not(.tasks-loaded) + .tasks-note {
				display: none;
			}

            .tasks-note {
                font-style: italic;
            }

			a:not(:active, :hover, :focus) {
				text-decoration: none;
			}
		</style>
	</head>
	<body>
		<?php body_header(); ?>
		<main>
			<div class="container">
				<div class="p-5 mb-4 bg-light rounded-3">
					<h1 class="display-4 fw-bold">Zoomiebot</h1>
					<p>Zoomiebot is a general-purpose Wikipedia bot, currently doing tasks that do not need requests for approval.</p>
					<div id="tasks">
						<i>Loading the list of tasks from Wikipedia...</i>
					</div>
					<p class="tasks-note">
						This table is loaded from Wikipedia and may be out of date. To ensure that it is up to date,
						<a href="https://en.wikipedia.org/w/index.php?title=User:Zoomiebot/jobs&action=purge" rel="nofollow">purge the page</a>.
					</p>
				</div>
			</div>
		</main>

		<script>
			const tasks = document.getElementById("tasks");

            fetch("https://en.wikipedia.org/api/rest_v1/page/html/User:Zoomiebot%2Fjobs")
				.then(r => r.text())
				.then(t => new Blob([t]))
				.then(b => URL.createObjectURL(b))
				.then(u => {
                    const frame = document.createElement("iframe");
                    frame.setAttribute("src", u);
                    frame.style.width = "0";
                    frame.style.height = "0";
                    frame.style.opacity = "0";
                    frame.style.position = "fixed";
                    frame.addEventListener("load", () => {
                        const frameDoc = frame.contentDocument;

                        frameDoc.querySelectorAll("a").forEach(v => {
                            if (v.getAttribute("href").startsWith("."))
                                v.setAttribute(
                                    "href",
									"//en.wikipedia.org/wiki/" + v.getAttribute("href").slice(0)
								)
						})
                        tasks.innerHTML =
                            frameDoc.querySelector("body > section[data-mw-section-id=\"0\"] > table")
								.outerHTML;
                        const table = tasks.querySelector("table");
                        table.classList.add("table");
                        table.classList.add("table-striped");
                        const table_head = document.createElement("thead");
                        table_head.appendChild(table.querySelector("tbody > tr:first-child"));
                        table.insertAdjacentElement("afterbegin", table_head);

                        tasks.classList.add("tasks-loaded");
					})
                    document.body.appendChild(frame);
				});
		</script>
	</body>
</html>
