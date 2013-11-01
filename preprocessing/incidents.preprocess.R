incidents.preprocess.REFERENCE_DATA <- "../data/sources/LFB/LFB data 1 Jan 2009 to 31 Mar 2013.csv.gz"

incidents.preprocess.readAndClean <- function (filename = incidents.preprocess.REFERENCE_DATA) {

    source("./OSGridToGeodesic.R")

    # Below is the size in latitude and longitude of the map square Davetaz
    # has experimentally identified as relevant for representation
    SIMPLIFIED_SQUARE_LATITUDE_SIZE <- 0.001
    SIMPLIFIED_SQUARE_LONGITUDE_SIZE <- 0.0015
    
    # this was prepared following the general instructions by Bloomberg School 
    # of Public Health's prof. Roger Peng, in Coursera's course "Computing for Data 
    # Analysis" (23/9/2013), "Reading and Writing Data" unit, slide 7
    classes <- structure(c("integer", "character", "character", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "integer", "integer", "integer", "integer", "factor", "factor", "integer", "factor", "integer", "factor", "integer", "integer"), .Names = c("IncidentNumber", "DateOfCall", "TimeOfCall", "IncidentGroup", "StopCodeDescription", "SpecialServiceType", "PropertyCategory", "PropertyType", "AddressQualifier", "Postcode_full", "Postcode_district", "WardCode", "WardName", "BoroughCode", "BoroughName", "Easting_m", "Northing_m", "Easting_rounded", "Northing_rounded", "FRS", "IncidentStationGround", "FirstPumpArriving_AttendanceTime", "FirstPumpArriving_DeployedFromStation", "SecondPumpArriving_AttendanceTime", "SecondPumpArriving_DeployedFromStation", "NumStationsWithPumpsAttending", "NumPumpsAttending"))
    
    # I read the original data
    data <- read.csv(filename, header = TRUE, sep = ',', colClasses = classes, na.strings = 'NULL')
    
    # I drop a) the rows that have NULL values in columns I need (not all rows 
    # with NULL values!), and b) the columns I don't need
    data <- subset(data, !is.na(FirstPumpArriving_AttendanceTime) & !is.na(Easting_rounded) & !is.na(Northing_rounded), c('DateOfCall', 'TimeOfCall', 'WardName', 'Easting_rounded', 'Northing_rounded', 'IncidentStationGround', 'FirstPumpArriving_AttendanceTime', 'FirstPumpArriving_DeployedFromStation'))
 
    # I drop all rows that have ' Not geo-coded' as the borough the incident 
    # happened in
    data <- subset(data, WardName != ' Not geo-coded')

    # I rename the columns
    colnames(data) <- c('date', 'time', 'borough', 'eastingRounded', 'northingRounded', 'ward', 'firstPumpTime', 'firstPumpStation')
    
    # I convert dates to R's format, thanks to instructions at 
    # http://www.ats.ucla.edu/stat/r/faq/string_dates.htm
    data$date <- as.Date(data$date, "%d-%b-%y")
    
    # I drop minutes and seconds from the time column, as there is
    # more granularity that I can use, including what I have in the footfall
    # data
    data$time <- as.factor(as.numeric(sapply(data$time, function (t) { unlist(strsplit(as.character(t), ":"))[1] })))
    
    # I convert the incidents' OS Grid coordinates to geodesic and drop the 
    # original ones
    data[, c("latitude", "longitude")] <- OSGridToGeodesic(data.frame(easting = data$eastingRounded, northing = data$northingRounded))
    data <- data[, !(names(data) %in% c('northingRounded', 'eastingRounded'))]

    # I calculate the coordinates of the simplified map square the incident 
    # belongs to and drop the original coordinates
    data[, c("simplifiedLatitude", "simplifiedLongitude") ] <- cbind(
        data$latitude %/% SIMPLIFIED_SQUARE_LATITUDE_SIZE * SIMPLIFIED_SQUARE_LATITUDE_SIZE,
        data$longitude %/% SIMPLIFIED_SQUARE_LONGITUDE_SIZE * SIMPLIFIED_SQUARE_LONGITUDE_SIZE
        )    
    data <- data[, !(names(data) %in% c("latitude", "longitude"))]

    data
}

incidents.preprocess.save <- function (incidents, filename) {
    write.table(incidents, file = filename, row.names = FALSE, sep = ',', na = 'NULL')
}


# Enhances the input incidents data frame by (re-)identifying its closest 
# Telefonica 'output area' using the non-approximated longitude and latitude. 
# Returns the enhanced incidents data frame and removes the non-approximated
# longitude and latitude.
incidents.preprocess.addTelefonicaGrid <- function (incidents, outputAreas) {

    # returns the Telefonica grid id of the output areas that is closest 
    # to the given incident
    findClosestOutputArea <- function (long, lat) {
            distances <- spDistsN1(data.matrix(outputAreas[, c('simplifiedLongitude', 'simplifiedLatitude')]), matrix(c(long, lat), nrow = 1, ncol = 2, byrow = TRUE), longlat = TRUE)
            # Note: if more than one output area is equally distant from the 
            # incident, the first is arbitrarily taken. We may want to change that
            outputAreas$telefonicaGridId[match(min(distances), distances)]
        }

    library(sp)
    library(data.table)
    incidents <- data.table(incidents)
    incidents <- incidents[, list(date, time, borough, ward, firstPumpTime, firstPumpStation, telefonicaGridId = findClosestOutputArea(simplifiedLongitude, simplifiedLatitude)), by = 'simplifiedLongitude,simplifiedLatitude' ]
    data.frame(incidents)
}


# adds footfall information and removes the Telefonica grid id
incidents.preprocess.addFootfall <- function (incidents, footfall, showProgress = FALSE) {

    # I drop all footfall I am not going to use
    footfall <- footfall[ footfall$telefonicaGridId %in% incidents$telefonicaGridId, ]
    # I round it to the closest integer
    footfall$footfallDensity <- round(footfall$footfallDensity, 0)
    if (showProgress) {
        noOfTelefonicaGridIds <- length(unique(incidents$telefonicaGridId))
        counter <- 0
    }
    results <- data.frame()
    for (f in unique(incidents$telefonicaGridId)) {
        if (showProgress) {
            counter <- counter + 1
            print(paste("Processing telefonicaGridId ", f, ", ", round(counter / noOfTelefonicaGridIds * 100, 1), "% complete...", sep = ""))
        }
        footfall2 <- subset(footfall, telefonicaGridId == f, c("day", "time", "footfallDensity"))
        incidents2 <- subset(incidents, telefonicaGridId == f)
        incidents2$day <- weekdays(incidents2$date)
        # TODO: using rbind to append rows to the 'results' data frame is 
        # inefficient; investigate better options with data.table, see 
        # http://stackoverflow.com/a/11486400/1218376
        results <- rbind(results, merge(x = incidents2, y = footfall2, by = c("day", "time"), all.x = TRUE))
    }
    setnames(results, 'footfallDensity', 'footfall')
    results
}