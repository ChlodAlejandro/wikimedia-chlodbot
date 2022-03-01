<?php
require_once(__DIR__ . "/../interface/head_global.php");
require_once(__DIR__ . "/../interface/body_header.php");

$zbMetadata = [
    "title" => "Utilities",
    "description" => "Simple web-based utilities for Wikipedia pages.",
];
$utilities = [
];
?>
<!doctype html>
<html lang="en">
	<head>
		<title>Utilities | Zoomiebot</title>
        <?php head_global(); ?>

		<!-- Page CSS -->
		<!--suppress CssUnusedSymbol -->
	</head>
	<body>
		<?php body_header(); ?>
		<main>
			<div class="container">
				<div class="p-5 mb-4 bg-light rounded-3">
					<h1 class="display-4 fw-bold">Utilities</h1>
					<p>Simple web-based utilities.</p>
					<div id="tasks">
						<table class="table">
							<thead>
								<tr>
									<td>Utility</td>
									<td>Description</td>
								</tr>
							</thead>
							<tbody>
								<?php if (count($utilities) == 0): ?>
								<tr>
									<td colspan="2">
										<i>There's nothing here yet. Come back later!</i>
									</td>
								</tr>
								<?php
								endif;
								foreach ($utilities as $path => $details):
								?>
								<tr>
									<td><a href="/utilities/<?php
										echo $path;
									?>"><?php
										echo $details["name"]
									?></a></td><td><?php
                                        echo $details["desc"]
									?></td>
								</tr>
								<?php
								endforeach;
								?>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</main>
	</body>
</html>
