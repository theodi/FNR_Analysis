<?php
error_reporting(E_ALL ^ E_NOTICE);
$lat_length = 0.001;
$long_length = 0.0015;

$to_excludes = $_GET["close"];
$to_exclude = explode(",",$to_excludes);
$stations_excluded = "";
$borough = $_GET["borough"];
for ($i=0;$i<count($to_exclude);$i++) {
	$stations_excluded[] = $to_exclude[$i];
}
if ($_GET["close"] == "") {
	$required_filename = "../data/IncidentsByBorough/" . $borough . ".json";
} else {
	$required_filename = "../data/IncidentsByBoroughWithClosures/" . $borough . "-minus-";
	for ($i=0;$i<count($stations_excluded);$i++) {
		$required_filename .= $stations_excluded[$i] . "_";
	}
	$required_filename = substr($required_filename,0,-1) . ".json";
}
if (file_exists($required_filename)) {
	header('Content-type: application/json');
	echo file_get_contents($required_filename);
	exit();
}

$mysqli = new mysqli("localhost", "root", "", "lfb_all");

if (count($stations_excluded) > 0) {
	$query = "Select distinct(WardName) from lfb_all where ";
	for($i=0;$i<count($stations_excluded);$i++) {
		$query .= 'lfb_all.FirstPumpArriving_DeployedFromStation="' . $stations_excluded[$i] . '" or ';
	}
	$query = substr($query,0,-4) . ";";
} else {
	$query = "Select distinct(WardName) from lfb_all;";
}
	
$res = $mysqli->query($query) or die($mysqli->error);
while ($row = $res->fetch_array(MYSQLI_ASSOC)) {
	$ward = trim($row["WardName"]);
	if ($ward != "Not geo-coded") {
		$filename = '../data/IncidentsByBorough/' . $ward . '.json';
		if (count($stations_excluded) > 0) {
			$filename = '../data/IncidentsByBoroughWithClosures/' . $ward . '-minus-';
			for ($i=0;$i<count($stations_excluded);$i++) {
				$filename .= $stations_excluded[$i] . "_";
			}
			$filename = substr($filename,0,-1) . ".json";
		}
		if (!file_exists($filename)) {
			getDataForWard($ward,$stations_excluded,$filename);
		}
	}
}

if (file_exists($required_filename)) {
	header('Content-type: application/json');
	echo file_get_contents($required_filename);
	exit();
}

function getDataForWard($ward,$stations_excluded,$filename) {
	global $mysqli,$lat_length,$long_length,$stations_reporting;
	$query = 'Select * from lfb_all where ';
	if (count($stations_reporting) > 0) {	
		$query .= "(";
		for ($i=0;$i<count($stations_reporting);$i++) {
			$query .= 'lfb_all.IncidentStationGround="' . $stations_reporting[$i] . '" or ';
		}
		$query = substr($query,0,-4);
		$query .= ') and ';
	}
	if (count($stations_excluded) > 0) {
		$query .= "(";
		for ($i=0;$i<count($stations_excluded);$i++) {
			$query .= 'lfb_all.FirstPumpArriving_DeployedFromStation!="' . $stations_excluded[$i] . '" and ';
		}
		$query = substr($query,0,-4);
		$query .= ') and ';
	}
	$query .= 'lfb_all.FirstPumpArriving_AttendanceTime>0 and WardName="'.$ward.'" order by Latitude_rounded;';
//	$query = 'Select * from lfb_all where lfb_all.FirstPumpArriving_AttendanceTime>0 order by Latitude_rounded;';
	$res = $mysqli->query($query) or die($mysqli->error);
	while ($row = $res->fetch_array(MYSQLI_ASSOC)) {
		$count++;
		$lat_base = $row["Latitude_rounded"] / $lat_length;
		$lat_base = round($lat_base) * $lat_length;
		$long_base = $row["Longitude_rounded"] / $long_length;
		$long_base = round($long_base) * $long_length;
		$grid_square = $lat_base . ", " . $long_base;
		$squares[$grid_square]["records"][] = $row;
		$squares[$grid_square]["lat_base"] = $lat_base;
		$squares[$grid_square]["long_base"] = $long_base;
	}
	mysqli_free_result($res);	
	
	if (count($stations_excluded) > 0) {
		$ward = $ward . "-minus-";
		for ($i=0;$i<count($stations_excluded);$i++) {
			$ward .= $stations_excluded[$i] . "_";
		}
		$ward = substr($ward,0,-1);
	}

	foreach ($squares as $grid_square => $data) {
		$polygon_coordinates = "";
		$polygon_coordinates[] = $data["long_base"] . "," . $data["lat_base"];
		$polygon_coordinates[] = ($data["long_base"] + $long_length) . "," . $data["lat_base"];
		$polygon_coordinates[] = ($data["long_base"] + $long_length) . "," . ($data["lat_base"] + $lat_length);
		$polygon_coordinates[] = $data["long_base"] . "," . ($data["lat_base"] + $lat_length);
		$polygon_coordinates[] = $data["long_base"] . "," . $data["lat_base"];
		$squares[$grid_square]["polygon"] = $polygon_coordinates;
		$squares[$grid_square]["incidentCount"] = count($data["records"]);
		$records = $data["records"];
		$total_time = 0;
		$stations = "";
		for ($i=0;$i<count($records);$i++) {
			$total_time += $records[$i]["FirstPumpArriving_AttendanceTime"];
			$stations[$records[$i]["FirstPumpArriving_DeployedFromStation"]]++;
		}
		// Pick the managing station with the most incidents in this square to manage the square
		$squares[$grid_square]["ward"] = $ward;
		$squares[$grid_square]["averageFirstEngine"] = $total_time / count($data["records"]);
		$stations_string = "";
		foreach ($stations as $station => $value) {
			$stations_string .= $station . " (" . $value . ") ";
		}
		$stations_string = substr($stations_string,0,-1);
		$squares[$grid_square]["attendingStations"] = $stations_string;
	}

	$json_squares = "";
	$count = 0;
	foreach ($squares as $grid_square => $data) {
		$json_string = '{"type":"Feature","id":"'.$count.'","properties":{';
		$json_string .= '"incidents":'.$data["incidentCount"].',';
		$json_string .= '"ward":"'.trim($data["ward"]).'",';
		$json_string .= '"response":'.$data["averageFirstEngine"].',';
		$json_string .= '"attending":"'.$data["attendingStations"].'"},';
		$json_string .= '"geometry":{"type":"Polygon","coordinates":[[';
		for ($i=0;$i<count($data["polygon"]);$i++) {
			$json_string .= '[' . $data["polygon"][$i] . '],';
		}
		$json_string = substr($json_string,0,-1);
		$json_string .= ']]}}';
		$json_squares[] = $json_string;
		$count++;
	}

	$handle = fopen($filename,'w');

	fwrite($handle,' {"type":"FeatureCollection","features":[' . "\n");
	$output = "";
	for ($i=0;$i<count($json_squares);$i++) {
		$output .= $json_squares[$i] . ",\n";
	}
	$output = trim($output);
	$output = substr($output,0,-1);
	fwrite($handle,$output . "\n");
	fwrite($handle,']}');
	fclose($handle);
}
?>
