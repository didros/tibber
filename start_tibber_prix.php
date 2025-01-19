#!/usr/bin/php

<?php
    $temp = shell_exec("/home/jeedom/dvp/tibber/tibber_price.js price");
    echo $temp;
?>
