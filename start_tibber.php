#!/usr/bin/php

<?php
    $temp = shell_exec("/home/jeedom/dvp/tibber/tibber.js power");
    echo $temp;
?>
