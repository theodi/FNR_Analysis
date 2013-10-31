s<?php

	require('ENtoLL.php');

	$row = 0;
	if (($handle = fopen("data.csv", "r")) !== FALSE) {
		while (($data = fgetcsv($handle, 1000, ",")) !== FALSE) {
			if ($row > 0) {
				$data = add_column_titles($column_titles,$data);
				$data = process_row($data);
				$res = add_row_to_database($data);
				if (!$res) {
					exit();
				}
			} else {
				$column_titles = $data;
			}
			$row++;
		}
		fclose($handle);
	}

	function add_column_titles($column_titles,$data) {
		for ($i=0;$i<count($column_titles);$i++) {
			$out[$column_titles[$i]] = $data[$i];
		}
		return $out;
	}

	$row_count;
	$query;
	$total;

	function add_row_to_database($data) {
		global $query,$row_count,$total;
		if ($row_count == 0) {
			$query = get_query_headers($data);
		} else {
			$query .= get_query_segment($data);
		}
		if ($row_count > 99) {
			$query = substr($query,0,-2) . ";";
			$mysqli = new mysqli("localhost", "root", "", "lfb_all");
			$res = $mysqli->query($query) or die($mysqli->error);
			$total += $row_count;
			echo "Done : " . $total . "\n";		
			$row_count = 0;
			$query = "";
			return $res;
		}
		$row_count = $row_count + 1;
		return true;
	}

	function get_query_headers($data) {
		$query = "INSERT into lfb_all (";
		foreach($data as $key => $value) {
			$query .= $key . ", ";
		}
		$query = substr($query,0,-2) . ") VALUES ";
		return $query;
	}

	function get_query_segment($data) {
		$ret = "(";
		foreach($data as $key => $value) {
			if (get_data_type($key) == "varchar") {
				$ret .= '"' . mysql_escape_string($value) . '", ';
			} elseif ((get_data_type($key) == "float" or get_data_type($key) == "int") and ($value == "" or !is_numeric($value))) {
				$ret .= "NULL, ";
			} else {
				$ret .= $value . ", ";
			}
		}
		$ret = substr($ret,0,-2) . "), ";
		return $ret;
	}

	function process_row($data) {
		$easting_m = $data["Easting_m"];
		$northing_m = $data["Northing_m"];
		$easting_rounded = $data["Easting_rounded"];
		$northing_rounded = $data["Northing_rounded"];

		$data["Latitude"] = "";
		$data["Longitude"] = "";
		$data["Latitude_rounded"] = "";
		$data["Longitude_rounded"] = "";		

		$array = "";
		if ($easting_m != "NULL" and $easting_m != "" and $northing_m != "NULL" and $northing_m != "") {
			$array = E_N_to_Lat_Long( $easting_m, $northing_m );
			$data["Latitude"] = $array[0];
			$data["Longitude"] = $array[1];
		}

		$array = "";
		if ($easting_rounded != "NULL" and $easting_rounded != "" and $northing_rounded != "NULL" and $northing_rounded != "") {
			$array = E_N_to_Lat_Long( $easting_rounded, $northing_rounded );
			$data["Latitude_rounded"] = $array[0];
			$data["Longitude_rounded"] = $array[1];			
		}

		unset($data["Easting_m"]);
		unset($data["Northing_m"]);
		unset($data["Easting_rounded"]);
		unset($data["Northing_rounded"]);

		foreach ($data as $key => $value) {
			if ($value == "NULL" || $value == "") {
				$data[$key] = "";
			}
		}
		return $data;
	}

	function get_data_type($field) {
		switch ($field) {
			case "IncidentNumber":
				return "int";
				break;
			case "DateOfCall":
				return "varchar";
				break;
			case "TimeOfCall":
				return "varchar";
				break;
			case "IncidentGroup":
				return "varchar";
				break;
			case "StopCodeDescription":
				return "varchar";
				break;
			case "SpecialServiceType":
				return "varchar";
				break;
			case "PropertyCategory":
				return "varchar";
				break;
			case "PropertyType":
				return "varchar";
				break;
			case "AddressQualifier":
				return "varchar";
				break;
			case "Postcode_full":
				return "varchar";
				break;
			case "Postcode_district":
				return "varchar";
				break;
			case "WardCode":
				return "varchar";
				break;
			case "WardName":
				return "varchar";
				break;
			case "BoroughCode":
				return "varchar";
				break;
			case "BoroughName":
				return "varchar";
				break;
			case "Latitude":
				return "float";
				break;
			case "Longitude":
				return "float";
				break;
			case "Latitude_rounded":
				return "float";
				break;
			case "Longitude_rounded":
				return "float";
				break;
			case "FRS":
				return "varchar";
				break;
			case "IncidentStationGround":
				return "varchar";
				break;
			case "FirstPumpArriving_AttendanceTime":
				return "int";
				break;
			case "FirstPumpArriving_DeployedFromStation":
				return "varchar";
				break;
			case "SecondPumpArriving_AttendanceTime":
				return "int";
				break;
			case "SecondPumpArriving_DeployedFromStation":
				return "varchar";
				break;
			case "NumStationsWithPumpsAttending":
				return "int";
				break;
			case "NumPumpsAttending":
				return "int";
				break;
		}
	}
?>
