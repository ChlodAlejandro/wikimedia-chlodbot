<?php
function get_home_dir() : string {
    return (
        getenv("HOME")
        || (array_key_exists("HOME", $_SERVER) && $_SERVER["HOME"])
    );
}
