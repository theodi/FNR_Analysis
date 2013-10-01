<?php

// Connecting, selecting database
$dbconn = pg_connect("host=localhost dbname=lfb_2012")
    or die('Could not connect: ' . pg_last_error());

// Performing SQL query
$query = 'SELECT ST_AsKML(ST_Simplify(ST_Buffer(ST_Collect(point_os), 100),100)) from lfb_2012 where firstpumparriving_attendancetime<600 and firstpumparriving_deployedfromstation="Acton";';
$result = pg_query($query) or die('Query failed: ' . pg_last_error());

// Printing results in HTML
while ($line = pg_fetch_array($result, null, PGSQL_ASSOC)) {
    foreach ($line as $col_value) {
       echo $col_value;
    }
}

// Free resultset
pg_free_result($result);

// Closing connection
pg_close($dbconn);

?>
