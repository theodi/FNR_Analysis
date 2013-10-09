<?php
error_reporting(E_ALL ^ E_NOTICE);

$to_excludes = $_GET["stations"];
$to_exclude = explode(",",$to_excludes);
for ($i=0;$i<count($to_exclude);$i++) {
	$stations_excluded[] = $to_exclude[$i];
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
		$wards[] = $ward;
	}
}

header('Content-type: application/json');
$json_string = '{ "boroughs": [';
for ($i=0;$i<count($wards);$i++) {
	 $json_string .= '"' . $wards[$i] . '",';
}
$json_string = substr($json_string,0,-1);
$json_string .= ']}';
echo $json_string;
