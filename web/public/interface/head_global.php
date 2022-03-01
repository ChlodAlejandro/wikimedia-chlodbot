<?php
$zbDefaults = [
	"locale" => "en_US",
    "siteName" => "Zoomiebot",
    "title" => "Zoomiebot",
	"type" => "website",
    "description" => "A Wikipedia bot.",
    "image" => "https://zoomiebot.toolforge.org/images/zoomiebot.png",
	"twitterCreator" => "toolfrog"
];

function getMetaData(string $tag): string {
	global $zbMetadata, $zbDefaults;
	return isset($zbMetadata) ? $zbMetadata[$tag] ?? $zbDefaults[$tag]: $zbDefaults[$tag];
}

function head_global() {
	$fullTitle = getMetaData("title") === getMetaData("siteName") ?
        getMetaData("title") : getMetaData("title") . " | " . getMetaData("siteName");
?>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">

	<title><?php echo $fullTitle ?></title>

	<!-- OpenGraph tags for website embeds -->
	<meta property="og:locale" content="<?php echo getMetaData("locale") ?>" />
	<meta property="og:site_name" content="<?php echo getMetaData("siteName") ?>" />
	<meta property="og:title" content="<?php echo getMetaData("title") ?>" />
	<meta property="og:type" content="<?php echo getMetaData("type") ?>" />
	<meta property="og:description" content="<?php echo getMetaData("description") ?>" />
	<meta property="og:image" content="<?php echo getMetaData("image") ?>"/>
	<meta property="og:image:url" content="<?php echo getMetaData("image") ?>"/>
	<meta property="og:image:secure-url" content="<?php echo getMetaData("image") ?>"/>

	<!-- Twitter? On the off-chance that someone wants to link this website. -->
	<meta name="twitter:title" content="<?php echo $fullTitle ?>"/>
	<meta name="twitter:card" content="summary"/>
	<meta name="twitter:creator" content="<?php echo getMetaData("twitterCreator") ?>"/>
	<meta name="twitter:description" content="<?php echo getMetaData("description") ?>">
	<meta name="twitter:image" content="<?php echo getMetaData("image") ?>"/>
	<meta name="twitter:site" content="@<?php echo getMetaData("twitterCreator") ?>"/>

	<!-- Additional metadata -->
	<meta property="description" content="<?php echo getMetaData("description") ?>">
	<link rel="icon shortcut" type="image/png" href="/images/zoomiebot.png">

	<!--
	-- Wondering where the gtag.js or other similar analytics script is? Guess what,
	-- there's none! This website does not collect analytics on its own, however Wikimedia
	-- may collect additional information related to your basic browser request information.
	--
	-- This website is bound by the Wikimedia Cloud Services Terms of use. More information
	-- can be found at https://wikitech.wikimedia.org/wiki/Wikitech:Cloud_Services_Terms_of_use
	-->

	<!-- Global CSS -->
	<link rel="stylesheet" type="text/css" href="/styles/global.css">

	<!-- Bootstrap -->
	<link rel="stylesheet" type="text/css" href="https://tools-static.wmflabs.org/cdnjs/ajax/libs/bootstrap/5.1.3/css/bootstrap.min.css">
	<link rel="stylesheet" type="text/css" href="https://tools-static.wmflabs.org/cdnjs/ajax/libs/bootstrap-icons/1.7.1/font/bootstrap-icons.min.css">
	<script src="https://tools-static.wmflabs.org/cdnjs/ajax/libs/bootstrap/5.1.3/js/bootstrap.bundle.min.js"></script>
<?php
}
?>

