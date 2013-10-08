preprocessIncidents <- function (outputAreas) {

	source("OSGridToGeodesic.R")

	# this was prepared following the general instructions by Bloomberg School 
	# of Public Health's prof. Roger Peng, in Coursera's course "Computing for 
	# Data Analysis" (23/9/2013), "Reading and Writing Data" unit, slide 7
	classes <- structure(c("integer", "character", "character", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "integer", "integer", "integer", "integer", "factor", "factor", "integer", "factor", "integer", "factor", "integer", "integer"), .Names = c("IncidentNumber", "DateOfCall", "TimeOfCall", "IncidentGroup", "StopCodeDescription", "SpecialServiceType", "PropertyCategory", "PropertyType", "AddressQualifier", "Postcode_full", "Postcode_district", "WardCode", "WardName", "BoroughCode", "BoroughName", "Easting_m", "Northing_m", "Easting_rounded", "Northing_rounded", "FRS", "IncidentStationGround", "FirstPumpArriving_AttendanceTime", "FirstPumpArriving_DeployedFromStation", "SecondPumpArriving_AttendanceTime", "SecondPumpArriving_DeployedFromStation", "NumStationsWithPumpsAttending", "NumPumpsAttending"))

	incidents <- read.csv("../../reference data/LFB/LFB data 1 Jan 2009 to 31 Mar 2013.csv.gz", header = TRUE, sep = ',', colClasses = classes, na.strings = 'NULL')

	# I drop a) the rows that have NULL values in columns I need (not all rows 
	# with NULL values!), and b) the columns I don't need
	incidents <- subset(incidents, !is.na(FirstPumpArriving_AttendanceTime) & !is.na(Easting_rounded) & !is.na(Northing_rounded), c('DateOfCall', 'TimeOfCall', 'IncidentGroup', 'Easting_rounded', 'Northing_rounded', 'IncidentStationGround', 'FirstPumpArriving_AttendanceTime', 'FirstPumpArriving_DeployedFromStation', 'SecondPumpArriving_AttendanceTime', 'SecondPumpArriving_DeployedFromStation'))

	# I convert dates to R's format, thanks to instructions at 
	# http://www.ats.ucla.edu/stat/r/faq/string_dates.htm
	incidents$DateOfCall <- as.Date(incidents$DateOfCall, "%d-%b-%y")

	# I filter out everything is not from 2012
	incidents <- subset(incidents, DateOfCall >= '2012-01-01' & DateOfCall <= '2012-12-31')

	# I convert the incidents' OS Grid coordinates to geodesic and drop the 
	# orignal ones
	incidents[, c("latitude", "longitude")] <- OSGridToGeodesic(data.frame(easting = incidents$Easting_rounded, northing = incidents$Northing_rounded))
	incidents <- incidents[, !(names(incidents) %in% c('Northing_rounded', 'Easting_rounded'))]

	# I identify the Telefonica grid cell whose centre the incident is closer
	for (incident in incidents) {
		x <- data.frame(telefonicaGridId = outputAreas$telefonicaGridId, latitudeDistance = abs(outputAreas$latitudeCentre - incidents[1,]$latitude) < outputAreas$heigth, longitudeDistance = abs(outputAreas$longitudeCentre - incidents[1, ]$longitude) < outputAreas$width)
	}

	incidents

}
