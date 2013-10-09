<?php
/**
  * Get Area Response Times
  * =======================
  * 
  * Calculates reponse times for stations and boroughs with all stations open or some closed
  * The response times are calculated per station and then averaged for the borough
  *
  */

error_reporting(E_ALL ^ E_NOTICE);

$borough = $_GET["borough"];
$station = $_GET["station"];
if ($_GET["closed"]) {
	$closed = explode(",",$_GET["closed"]);
}

$mysqli = new mysqli("localhost", "root", "", "lfb_all");

if ($station != "") {
	$response_time = getStationResponseTime($station,$closed);
}

if ($borough != "") {
	$response_time = getBoroughResponseTime($borough,$closed);
}

echo $response_time;

function getStationResponseTime($station,$closed) {
	global $mysqli;
	if ($closed) {
		$query = 'Select count(*),sum(FirstPumpArriving_AttendanceTime) from lfb_all where IncidentStationGround="'.$station.'" and FirstPumpArriving_AttendanceTime>0 and ';
		for ($i=0;$i<count($closed);$i++) {
			$query .= 'FirstPumpArriving_DeployedFromStation!="'.$closed[$i].'" and '; 
		}
		$query = substr($query,0,-5) . ';';
	} else {
		$query = 'Select count(*),sum(FirstPumpArriving_AttendanceTime) from lfb_all where IncidentStationGround="'.$station.'" and FirstPumpArriving_AttendanceTime>0;';
	}
	$res = $mysqli->query($query) or die($mysqli->error);
	$row = $res->fetch_row();
	$count = $row[0];
	$total = $row[1];
	$average = $total / $count;

	return($average);	
}

function getBoroughResponseTime($borough,$closed) {
	$stations = getStationsInBorough($borough);
	$total_time = 0;
	for($i=0;$i<count($stations);$i++) {
		$total_time += getStationResponseTime($stations[$i],$closed);
	}
	$average = $total_time / count($stations);
	return $average;
}

function getStationsInBorough($borough) {
	$json_string = file_get_contents('../data/stations.json');
	$stations = json_decode($json_string,true);
	for ($i=0;$i<count($stations);$i++) {
		if ($stations[$i]["borough"] == $borough) {
			$ret[] = $stations[$i]["name"];
		}
	}
	return $ret;
}


?>
