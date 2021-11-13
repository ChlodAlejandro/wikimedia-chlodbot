<?php
function get_home_dir() : string {
    return (
        get_cfg_var("HOME_DIR")
        || getenv("HOME")
        || (array_key_exists("HOME", $_SERVER) && $_SERVER["HOME"])
    );
}
