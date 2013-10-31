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

function getStationResponseTime($station,$closed,$borough) {
	global $mysqli;
	if ($closed) {
		$query = 'Select count(*),sum(FirstPumpArriving_AttendanceTime) from lfb_all where IncidentStationGround="'.$station.'" and FirstPumpArriving_AttendanceTime>0 and ';
		for ($i=0;$i<count($closed);$i++) {
			$query .= 'FirstPumpArriving_DeployedFromStation!="'.$closed[$i].'" and '; 
		}
	} else {
		$query = 'Select count(*),sum(FirstPumpArriving_AttendanceTime) from lfb_all where IncidentStationGround="'.$station.'" and FirstPumpArriving_AttendanceTime>0 and ';
	}
	if ($borough != "") {
		$query = $query . 'WardName="'.$borough.'" and ';
	}
	$query = substr($query,0,-5) . ';';
	echo $query;
	$res = $mysqli->query($query) or die($mysqli->error);
	$row = $res->fetch_row();
	$count = $row[0];
	$total = $row[1];
	$average = $total / $count;

	return($average);	
}

function getBoroughResponseTime($borough,$closed) {
	global $mysqli;
	$query = 'select count(*),sum(FirstPumpArriving_AttendanceTime) from lfb_all where FirstPumpArriving_AttendanceTime>0 and WardName="'.$borough.'"';
	if ($closed) {
		$query .= " and ";
		for ($i=0;$i<count($closed);$i++) {
			$query .= 'FirstPumpArriving_DeployedFromStation!="'.$closed[$i].'" and '; 
		}
		$query = substr($query,0,-5);
	}
	$query .= ";";
	$res = $mysqli->query($query) or die($mysqli->error);
	$row = $res->fetch_row();
	$count = $row[0];
	$total = $row[1];
	$average = $total / $count;
	return $average;
}

?>
