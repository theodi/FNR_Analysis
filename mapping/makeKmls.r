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
reach_as_first_pump_arriving <- subset(incidents, FirstPumpArriving_AttendanceTime <= 360, c('FirstPumpArriving_DeployedFromStation', 'FirstPumpArriving_AttendanceTime', 'longitude', 'latitude'))
colnames(reach_as_first_pump_arriving) <- c("station", "attendanceTime", "longitude", "latitude")

reach_as_second_pump_arriving <- subset(incidents, SecondPumpArriving_AttendanceTime <= 360, c('SecondPumpArriving_DeployedFromStation', 'FirstPumpArriving_AttendanceTime', 'longitude', 'latitude'))
colnames(reach_as_second_pump_arriving) <- c("station", "attendanceTime", "longitude", "latitude")

reach <- rbind(reach_as_first_pump_arriving, reach_as_second_pump_arriving)

for (s in levels(reach$station)) {
	reach_station <- subset(reach, station == s, c('longitude', 'latitude'))
	reach_vertices <- chull(reach_station)
	reach_polygons <- Polygons(list(Polygon(reach_station[c(reach_vertices, reach_vertices[1]), ])), "1")
	kmlPolygon(reach_polygons, kmlfile = paste("maps/", s, ".kml", sep = ""), name = s, col = "#df0000aa", lwd = 5, border = 4, kmlname = s, kmldescription = "")
}

# for later
# stations_classes <- structure(c("factor", "character", "numeric", "numeric"), .Names = c("name", "address", "latitude", "longitude"))

# stations <- read.csv("stations.csv", header = TRUE, sep = ',', colClasses = stations_classes, na.strings = 'NULL')
