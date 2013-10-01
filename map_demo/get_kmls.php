<?php
error_reporting(E_ALL ^ E_NOTICE);

$dbconn = pg_connect("host=localhost dbname=lfb_2012")
    or die('Could not connect: ' . pg_last_error());

$row = 0;
if (($handle = fopen("stations.csv", "r")) !== FALSE) {
    while (($data = fgetcsv($handle, 1000, ",")) !== FALSE) {
    	if ($row > 0) {
		$value = "";
		$polygons = "";
		$linestring = "";
		$station = $data[0];
		echo $station . "\n";
		$whandle = fopen("station_kmls/" . $station . ".kml","w");		
		$value = get_kml_headers();
		//$query = "SELECT ST_AsKML(ST_Simplify(ST_Buffer(ST_Collect(point_os), 500), 0)) from lfb_2012 where firstpumparriving_attendancetime<600 and firstpumparriving_deployedfromstation='".$station."';";
		$query = "SELECT ST_AsKML(ST_Simplify(ST_Buffer(ST_Union(point_os),500),0)) from lfb_2012 where firstpumparriving_attendancetime<600 and firstpumparriving_deployedfromstation='".$station."';";
		$result = pg_query($query) or die('Query failed: ' . pg_last_error());
		while ($line = pg_fetch_array($result, null, PGSQL_ASSOC)) {
		    foreach ($line as $col_value) {
		        $polygons .= $col_value;
		    }
		}
		$polygons = get_biggest($polygons);
		
		//$query = "SELECT ST_AsKML(ST_Boundary(ST_GeomFromKML('".$polygons."')))";
		$query = "SELECT ST_AsKML(ST_Buffer(ST_Boundary(ST_GeomFromKML('".$polygons."')),0.00001))";
		//$query = "SELECT ST_AsKML(ST_Buffer(ST_Boundary(ST_GeomFromKML('".$polygons."')),-10))";
		$result = pg_query($query) or die('Query failed: ' . pg_last_error());
		while ($line = pg_fetch_array($result, null, PGSQL_ASSOC)) {
		    foreach ($line as $col_value) {
		        $linestring .= $col_value;
		    }
		}
		echo $linestring;

		$value .= $linestring;
		$value .= get_kml_footers();
		$dom = new DOMDocument;
		$dom->preserveWhiteSpace = FALSE;
		$dom->loadXML($value);
		$dom->formatOutput = TRUE;
		$value = $dom->saveXml();
		fwrite($whandle,$value);
		fclose($whandle);
		pg_free_result($result);
	}
	$row++;
    }
} 

// Closing connection
pg_close($dbconn);

function get_biggest($polygons) {
	$split = explode('<coordinates>',$polygons);
	$length = 0;
	$to_ret = 0;
	for ($i=1;$i<count($split);$i++) {
		$j = $i - 1;
		$out[$j] = strip_tags($split[$i]);
		if (strlen($out[$j]) > $length) {
			$length = strlen($out[$j]);
			$to_ret = $j;
		}
	}
	$return = "<Polygon><outerBoundaryIs><LinearRing><coordinates>";
	$return .= $out[$to_ret];
	$return .= "</coordinates></LinearRing></outerBoundaryIs></Polygon>";
	return $return;
}

function get_kml_headers() {
return '<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://earth.google.com/kml/2.2">
<Document>
<Style id="style3">
    <LineStyle>
      <color>40000000</color>
      <width>3</width>
    </LineStyle>
    <PolyStyle>
      <color>1A0000FF</color>
      <fill>1</fill>
      <outline>1</outline>
    </PolyStyle>
  </Style>
<Placemark>
<styleUrl>#style3</styleUrl>';
}

function get_kml_footers() {
return '</Placemark>
</Document></kml>';
}
?>
