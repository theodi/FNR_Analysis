<?php
error_reporting(E_ALL ^ E_NOTICE);
$lat_length = 0.001;
$long_length = 0.0015;
$mysqli = new mysqli("localhost", "root", "", "lfb_all");

$to_excludes = $_GET["close"];
$to_exclude = explode(",",$to_excludes);
unset($stations_excluded);
$borough = $_GET["borough"];
for ($i=0;$i<count($to_exclude);$i++) {
	$stations_excluded[] = $to_exclude[$i];
}

getDataForWard($borough,$stations_excluded,"");

function getDataForWard($ward,$stations_excluded,$filename) {
	global $mysqli,$lat_length,$long_length;
	$query = 'Select * from lfb_all where ';
	$query .= 'lfb_all.FirstPumpArriving_AttendanceTime>0 and WardName="'.$ward.'" order by Latitude_rounded;';
	//$query .= 'WardName="'.$ward.'" order by Latitude_rounded;';
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

	$global_total = 0;
	$gloabl_count = 0;
	unset($global_cat);
	
	foreach ($squares as $grid_square => $data) {
		$average = 0;
		unset($to_replace);
		$records = $data["records"];
		for ($i=0;$i<count($records);$i++) {
			$needle = trim($records[$i]["FirstPumpArriving_DeployedFromStation"]);
			if (in_array($needle,$stations_excluded)) {
				$to_replace[] = $i;
			} else {
				$time = $records[$i]["FirstPumpArriving_AttendanceTime"];
				$bound = floor($time / 30);
				$global_cat[$bound]++;
				$global_total += $time;
				$global_count++;
			}
		}
		$records_in = $records;
		$lat_coverage = $lat_length;
		$long_coverage = $long_length;
		$coverage_multiplier = 0;
		$transition_multiplier = 0;
		while ($average == 0) {
			$average = getAverageFromRecords($records_in,$stations_excluded);
			if ($average == 0) {
				$ll = explode(",",$grid_square);
				$lat = trim($ll[0]);
				$long = trim($ll[1]);

				$coverage_multiplier = ($lat_coverage / $lat_length) + 2;
				$lat_coverage = $lat_length * $coverage_multiplier;
				$long_coverage = $long_length * $coverage_multiplier;
		
				$transition_multiplier = ($coverage_multiplier - 1) / 2;
				$new_lat = $lat + ($transition_multiplier * $lat_length);
				$new_long = $long - ($transition_multiplier * $long_length);
//				echo "OLD $lat New $new_lat \n";
//				echo "OLD $long New $new_long \n";
				$records_in = getExpandedAreaRecords($new_lat,$new_long,$lat_coverage,$long_coverage,$squares);
//				echo "Expanded search area by $coverage_multiplier \n";
//				echo "OLD \n";
//				print_r($squares["$lat, $long"]);
//				echo "CURRENT \n";
//				print_r($squares["$new_lat, $new_long"]);
//				print_r($records_in);
//				exit();
			} else {
//				echo "Got a new average from expansion of $average \n";
			}
		}
		for($i=0;$i<count($to_replace);$i++) {
			$global_total += $average;
			$global_count++;
//			echo "Replacing " . $records[$to_replace[$i]]["FirstPumpArriving_AttendanceTime"] . " with " . $average . "\n";
			$records[$to_replace[$i]]["FirstPumpArriving_AttendanceTime"] = $average;
			$squares[$grid_square]["records"] = $records;
			
			$bound = floor($average / 30);
			$global_cat[$bound]++;
		}
	}
	
	$global_average = $global_total / $global_count;
	echo '{' . "\n\t" .  '"averageResponseTime":' . $global_average . ',' . "\n";
	echo "\t" . '"distribution": [' . "\n"; 
	$max_bound = 0;
	foreach ($global_cat as $bound => $count) {
		if ($bound > $max_bound) {
			$max_bound = $bound;
		}
	}
	$json = "";
	for ($i=0;$i<$max_bound;$i++) {
		$time_min = 30 * $i;
		$time_max = $time_min + 30;
		$json .=  "\t\t" . '{"timeMin": ' . $time_min . ', "timeMax": ' . $time_max . ', "incidents":' . $global_cat[$i] . '},' . "\n";
	}
	$json = substr(trim($json),0,-1);
	$json .= "\n";
	echo $json;
	echo "\t]\n";
	echo "}";
	
}

function getExpandedAreaRecords($new_lat,$new_long,$lat_coverage,$long_coverage,$squares) {
	unset($total_recs);
//	echo "Using $new_lat with coverage area of $lat_coverage\n";
//	echo "Using $new_long with coverage area of $long_coverage\n";
	foreach ($squares as $grid_square => $data) {
		$ll = explode(",",$grid_square);
		$lat = trim($ll[0]);
		$long = trim($ll[1]);
		if ($lat <= $new_lat and $lat > ($new_lat - $lat_coverage)) {
			if ($long >= $new_long and $long < ($new_long + $long_coverage)) {
//				echo "Double Match! $long and $new_long\n";
				$records = $data["records"];
				for ($i=0;$i<count($records);$i++) {
					$total_recs[] = $records[$i];
				}
			}
		}
	} 
	return $total_recs;
}	

function getAverageFromRecords($records,$stations_excluded) {
	$average = 0;
	$total = 0;
	$count = 0;
	for ($i=0;$i<count($records);$i++) {
		$needle = trim($records[$i]["FirstPumpArriving_DeployedFromStation"]);
		if (!in_array($needle,$stations_excluded)) {
			$total += $records[$i]["FirstPumpArriving_AttendanceTime"];
			$count++;	
		}
	} 
	if ($count > 0) {
		$average = $total / $count;
	}
	return $average;
}

/*
	foreach ($squares as $grid_square => $data) {
		$average = 0;
		$total = 0;
		$count = 0;
		unset($to_replace);
		$records = $data["records"];
		for ($i=0;$i<count($records);$i++) {
			$needle = trim($records[$i]["FirstPumpArriving_DeployedFromStation"]);
			if (in_array($needle,$stations_excluded)) {
				$to_replace[] = $i;
			} else {
				$total += $records[$i]["FirstPumpArriving_AttendanceTime"];
				$global_total += $records[$i]["FirstPumpArriving_AttendanceTime"];
				$count++;
				$global_count++;
			}
		}

		if ($count > 0 and count($to_replace) > 0) {
			$average = $total / $count;
			for($i=0;$i<count($to_replace);$i++) {
				$global_total += $average;
				$global_count++;
				//echo "Replacing " . $records[$to_replace[$i]]["FirstPumpArriving_AttendanceTime"] . " with " . $average . "\n";
				$records[$to_replace[$i]]["FirstPumpArriving_AttendanceTime"] = $average;
				$squares[$grid_square]["records"] = $records;
			}
		} elseif (count($to_replace) < 1) {
		} elseif (count($to_replace) > 0 and $count < 1) {
			//echo "No data to replace grid square " . $grid_square . "\n";
		}

	}
	$average = $global_total / $global_count;
	echo $average;

}
*/
?>
