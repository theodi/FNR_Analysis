<?php

	require_once('GetAreaResponseTime.php');

	$handle = fopen('../data/LondonBoroughs.kml','r');
	while ($line = fgets($handle)) {
		$line = trim($line);
		if (strpos($line,"name") != false) {
			$name = strip_tags($line);
		}
		$line = strip_tags($line);
		$parts = explode(" ",$line);
		if (count($parts) > 5) {
			for ($i=0;$i<count($parts);$i++) {
				$coords = $parts[$i];
				if (substr($coords,0,1) == ".") {
					$coords = "0" . $coords;
				}
				if (substr($coords,0,2) == "-.") {
					$coords = "-0." . substr($coords,2,strlen($coords));
				}
				$polygon[$name][] = $coords;
			}
		}
	}
	fclose($handle);
	
	$count = 0;
	foreach ($polygon as $name => $poly) {
		echo "processing $name \n\n";
		$json_string = '{"type":"FeatureCollection","features":[' . "\n";
		$json_string .= "\t{";
		$json_string .= "\t\t" . '"type":"Feature",' . "\n";
		$json_string .= "\t\t" . '"id":"'.$count.'",' . "\n";
		$json_string .= "\t\t" . '"properties":{' . "\n";
		$json_string .= "\t\t\t" . '"borough":"'.$name.'",' . "\n";
		$json_string .= "\t\t\t" . '"response":"'.round(getBoroughResponseTime($name,"")).'"' . "\n";
		$json_string .= "\t\t" . '},' . "\n";
		$json_string .= "\t\t" . '"geometry":{' . "\n";
		$json_string .= "\t\t\t" . '"type":"Polygon",' . "\n";
		$json_string .= "\t\t\t" . '"coordinates":[[' . "\n";
		for ($i=0;$i<count($poly);$i++) {
			$json_string .= "\t\t\t\t" . '[' . $poly[$i] . '],' . "\n";
		}
		$json_string = substr($json_string,0,-2) . "\n";
		$json_string .= "\t\t\t" . ']]' . "\n";
		$json_string .= "\t\t" . '}' . "\n";
		$json_string .= "\t" . '}' . "\n";
		$json_string .= ']}';
		$handle = fopen("../data/BoroughBoundaries/" . $name . ".json","w");
		if ($handle) {
			fwrite($handle,$json_string);
			fclose($handle);
		} else {
			echo "no file $name.json\n";
		}
		$count++;
	}
?>
