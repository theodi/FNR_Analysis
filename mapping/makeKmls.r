library("maptools")

incidents_classes <- structure(c("character", "character", "factor", "factor", "integer", 
"factor", "integer", "factor", "numeric", "numeric"), .Names = c("DateOfCall", 
"TimeOfCall", "IncidentGroup", "IncidentStationGround", "FirstPumpArriving_AttendanceTime", 
"FirstPumpArriving_DeployedFromStation", "SecondPumpArriving_AttendanceTime", 
"SecondPumpArriving_DeployedFromStation", "latitude", "longitude"
))

incidents <- read.csv("incidents.csv", header = TRUE, sep = ',', colClasses = incidents_classes, na.strings = 'NULL')

# I keep only the incidents to which the first pump to arrive was the station 
# ground's and attendance time was withing the target 6 minutes; I presume that
# the polygon represented by the remaining set of incidents is a good 
# approximation of the geographical area that can be served by the station in 
# six minutes. I also drop the columns that are not required in the following.
incidents_own <- subset(incidents, (FirstPumpArriving_DeployedFromStation == IncidentStationGround) & (FirstPumpArriving_AttendanceTime <= 360), c('DateOfCall', 'TimeOfCall', 'IncidentStationGround', 'latitude', 'longitude'))
incidents_other <- subset(incidents, ((FirstPumpArriving_DeployedFromStation != IncidentStationGround) & (FirstPumpArriving_AttendanceTime <= 360)) | ((SecondPumpArriving_DeployedFromStation != IncidentStationGround) & (SecondPumpArriving_AttendanceTime <= 360)), c('DateOfCall', 'TimeOfCall', 'IncidentStationGround', 'latitude', 'longitude'))

for (station in levels(incidents$IncidentStationGround)) {

	incidents_station <- subset(incidents_own, IncidentStationGround == station, c('longitude', 'latitude'))
	attendance_area_vertices <- chull(incidents_station)
	attendance_area <- Polygons(list(Polygon(incidents_station[c(attendance_area_vertices, attendance_area_vertices[1]), ])), "1")
	kmlPolygon(attendance_area, kmlfile = paste("maps/", station, "_own.kml", sep = ""), name = paste(station, "(own)"), col = "#df0000aa", lwd = 5, border = 4, kmlname = station, kmldescription = "")

	incidents_station <- subset(incidents_other, IncidentStationGround == station, c('longitude', 'latitude'))
	attendance_area_vertices <- chull(incidents_station)
	attendance_area <- Polygons(list(Polygon(incidents_station[c(attendance_area_vertices, attendance_area_vertices[1]), ])), "1")
	kmlPolygon(attendance_area, kmlfile = paste("maps/", station, "_other.kml", sep = ""), name = paste(station, "(other)"), col = "#df0000aa", lwd = 5, border = 4, kmlname = station, kmldescription = "")
}

# for later
# stations_classes <- structure(c("factor", "character", "numeric", "numeric"), .Names = c("name", "address", "latitude", "longitude"))

# stations <- read.csv("stations.csv", header = TRUE, sep = ',', colClasses = stations_classes, na.strings = 'NULL')
