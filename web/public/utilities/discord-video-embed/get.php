<?php
include_once __DIR__ . "/../../../../vendor/autoload.php";

use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\Promise\Utils;
use GuzzleHttp\RequestOptions;

$package = json_decode(file_get_contents(__DIR__ . "/../../../package.json"));
$version = $package->version;

// Setup Guzzle
$client = new Client([
    RequestOptions::HEADERS => [
        "User-Agent" => "Zoomiebot/$version (https://w.wiki/3Yti; chlod@chlod.net; User:Chlod) "
            . $_SERVER["HTTP_USER_AGENT"]
    ]
]);

// Get file information
$file = preg_replace('/^:?File:/', '', $_GET["file"]);
try {
    $fileInfoResponse = $client->post("https://commons.wikimedia.org/w/api.php", [
        RequestOptions::FORM_PARAMS => [
            "utf8" => 1,
            "formatversion" => "2",
            "format" => "json",
            "action" => "query",
            "prop" => "videoinfo",
            "titles" => "\u{001f}File:$file",
            "viprop" => "derivatives|size|mediatype|url"
        ]
    ]);

    $fileInfo = json_decode($fileInfoResponse->getBody()->getContents())->query->pages[0];
    if (isset($fileInfo->missing)) {
        http_response_code(404);
        echo "File not found: " . htmlspecialchars($file);
    } else if (isset($fileInfo->filehidden)) {
        http_response_code(404);
        echo "File is hidden from public view (deleted or suppressed): " . htmlspecialchars($file);
    } else {
        $videoInfo = $fileInfo->videoinfo[0];
        if (empty($videoInfo)) {
            error_log(var_export($fileInfo, true));
            http_response_code(400);
            echo "Bad file";
        } else if ($videoInfo->mediatype !== "VIDEO") {
            echo $videoInfo->url;
        } else {
            $duration = $videoInfo->duration;
            $derivatives = $videoInfo->derivatives;

            $sizes = [];
            $sizePromises = [];

            foreach ($derivatives as $derivative) {
                $sizePromise = $client->headAsync($derivative->src)
                    ->then(function ($response) use ($derivative, &$sizes) {
                        $sizes[$derivative->transcodekey ?? $derivative->shorttitle] =
                            [
                                "size" => intval($response->getHeader("Content-Length")[0]),
                                "derivative" => $derivative
                            ];
                    });
                $sizePromises[] = $sizePromise;
            }

            Utils::all($sizePromises)->wait();
            $sizes = array_filter($sizes, function ($size) {
                return $size["size"] < 52428800;
            }, ARRAY_FILTER_USE_BOTH);
            $best = array_reduce($sizes, function ($best, $size) {
                if ($best === null) {
                    return $size;
                } else {
                    $bestPixels = $best["derivative"]->width * $best["derivative"]->height;
                    $currentPixels = $size["derivative"]->width * $size["derivative"]->height;

                    return $bestPixels < $currentPixels ? $size : $best;
                }
            });

            if ($best == null) {
                http_response_code(404);
                echo "No suitable derivative found";
            } else {
                header("Location: " . $best["derivative"]->src);
            }
        }
    }
} catch (GuzzleException $e) {
    if ($e instanceof ClientException) {
        $response = $e->getResponse();
        http_response_code($response->getStatusCode());
        header("Content-Type: application/json");
        echo $response->getBody()->getContents();
    } else {
        error_log($e);
        http_response_code(500);
        echo "Internal Server Error";
    }
}
