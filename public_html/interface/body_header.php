<?php
function body_header(callable $postNav = null) {
?>
	<header class="bg-dark p-3 border-bottom" style="height: 74px;">
		<div class="container">
			<div class="d-flex flex-wrap align-items-center justify-content-center justify-content-lg-start">
				<img id="logo" src="/images/zoomiebot-face.svg" alt="Zoomiebot" class="me-3">
				<ul class="nav me-lg-auto">
					<li>
						<a class="nav-link px-2 text-white" href="//en.wikipedia.org/wiki/User:Zoomiebot">User</a>
					</li>
					<li>
						<a class="nav-link px-2 text-white" href="/">Home</a>
					</li>
					<li>
						<a class="nav-link px-2 text-white" href="/logs">Logs</a>
					</li>
				</ul>
				<?php if ($postNav != null) echo $postNav(); ?>
			</div>
		</div>
	</header>
<?php
}
?>
