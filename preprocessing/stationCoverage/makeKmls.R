makeKmls.PREPROCESSED_INCIDENTS_DEFAULT <- "../../preprocessing/incidents/incidents.csv"
makeKmls.PREPROCESSED_STATIONS_DEFAULT <- "../../preprocessing/stations/stations.csv"

makeKmls.save <- function (preprocessedIncidents = makeKmls.PREPROCESSED_INCIDENTS_DEFAULT, preprocessedStations = makeKmls.PREPROCESSED_STATIONS_DEFAULT, folder = "maps") {

    library("maptools")
    library("rgeos")
    
    incidentsClasses <- structure(c("character", "character", "factor", "factor", "integer", "factor", "integer", "factor", "numeric", "numeric"), .Names = c("DateOfCall", "TimeOfCall", "IncidentGroup", "IncidentStationGround", "FirstPumpArriving_AttendanceTime", "FirstPumpArriving_DeployedFromStation", "SecondPumpArriving_AttendanceTime", "SecondPumpArriving_DeployedFromStation", "latitude", "longitude"))
    incidents <- read.csv(preprocessedIncidents, header = TRUE, sep = ',', colClasses = incidentsClasses, na.strings = 'NULL')
    
    stationsClasses <- structure(c("factor", "character", "numeric", "numeric"), .Names = c("name", "address", "latitude", "longitude"))
    stations <- read.csv(preprocessedStations, header = TRUE, sep = ',', colClasses = stationsClasses, na.strings = 'NULL')
    
    # I infer each station's taerget area of coverage by the location of all
    # the incidents their pump arrives first to, whatever the time it takes
    for (s in levels(incidents$FirstPumpArriving_DeployedFromStation)) {
        sourceStation <- subset(stations, name == s, c('longitude', 'latitude'))[1,]
        coverage <- subset(incidents, (FirstPumpArriving_DeployedFromStation == s) & (FirstPumpArriving_AttendanceTime <= 360), c('longitude', 'latitude'))
        
        # the convex hull version
        coverage_vertices <- chull(coverage)
        coverage_area <- Polygons(list(Polygon(coverage[c(coverage_vertices, coverage_vertices[1]), ])), "1")
        
#         # the buffer version
#         lines <- mapply(function (x, y) { Line(rbind(sourceStation, c(x, y))) }, coverage$longitude, coverage$latitude)
#         area <- gBuffer(SpatialLines(list(Lines(lines, ID = s))), width = 0.0012, capStyle = "ROUND")
#         coverage_area <- area@polygons[[1]]
        
        # I create and save the .kml
        kmlPolygon(coverage_area, kmlfile = paste(folder, "/", s, ".kml", sep = ""), name = s, col = "#df0000aa", lwd = 5, border = 4, kmlname = s, kmldescription = "")        
    }
    
}
