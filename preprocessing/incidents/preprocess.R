incidents.preprocess.REFERENCE_DATA <- "../../reference data/LFB/LFB data 1 Jan 2009 to 31 Mar 2013.csv.gz"

incidents.preprocess.run <- function (filename = incidents.preprocess.REFERENCE_DATA) {

    source("./OSGridToGeodesic.R")

    # Below is the size in latitude and longitude of the map square Davetaz
    # has experimentally identified as relevant for representation
    DAVETAZ_SQUARE_LATITUDE_SIZE <- 0.001
    DAVETAZ_SQUARE_LONGITUDE_SIZE <- 0.0015
    
    # this was prepared following the general instructions by Bloomberg School 
    # of Public Health's prof. Roger Peng, in Coursera's course "Computing for Data 
    # Analysis" (23/9/2013), "Reading and Writing Data" unit, slide 7
    classes <- structure(c("integer", "character", "character", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "integer", "integer", "integer", "integer", "factor", "factor", "integer", "factor", "integer", "factor", "integer", "integer"), .Names = c("IncidentNumber", "DateOfCall", "TimeOfCall", "IncidentGroup", "StopCodeDescription", "SpecialServiceType", "PropertyCategory", "PropertyType", "AddressQualifier", "Postcode_full", "Postcode_district", "WardCode", "WardName", "BoroughCode", "BoroughName", "Easting_m", "Northing_m", "Easting_rounded", "Northing_rounded", "FRS", "IncidentStationGround", "FirstPumpArriving_AttendanceTime", "FirstPumpArriving_DeployedFromStation", "SecondPumpArriving_AttendanceTime", "SecondPumpArriving_DeployedFromStation", "NumStationsWithPumpsAttending", "NumPumpsAttending"))
    
    # I read the original data (no need for Google Refine, as for the Javascript 
    # version)
    data <- read.csv(filename, header = TRUE, sep = ',', colClasses = classes, na.strings = 'NULL')
    
    # I drop a) the rows that have NULL values in columns I need (not all rows 
    # with NULL values!), and b) the columns I don't need
    data <- subset(data, !is.na(FirstPumpArriving_AttendanceTime) & !is.na(Easting_rounded) & !is.na(Northing_rounded), c('DateOfCall', 'TimeOfCall', 'IncidentGroup', 'WardName', 'Easting_rounded', 'Northing_rounded', 'IncidentStationGround', 'FirstPumpArriving_AttendanceTime', 'FirstPumpArriving_DeployedFromStation'))
 
    # I drop all rows that have ' Not geo-coded' as the borough the incident 
    # happened in
    data <- subset(data, WardName != ' Not geo-coded')

    # I rename the columns
    colnames(data) <- c('date', 'time', 'incidentGroup', 'borough', 'eastingRounded', 'northingRounded', 'ward', 'firstPumpTime', 'firstPumpStation')
    
    # I convert dates to R's format, thanks to instructions at 
    # http://www.ats.ucla.edu/stat/r/faq/string_dates.htm
    data$date <- as.Date(data$date, "%d-%b-%y")
    
    # I filter out everything is not from 2012
#    data <- subset(data, (date >= '2012-01-01') & (date <= '2012-12-31'))

    # I drop minutes and seconds from the time column, as there is
    # more granularity that I can use, including what I have in the footfall
    # data
    data$time <- as.factor(as.numeric(sapply(data$time, function (t) { unlist(strsplit(as.character(t), ":"))[1] })))
    
    # I convert the incidents' OS Grid coordinates to geodesic and drop the 
    # original ones
    data[, c("latitude", "longitude")] <- OSGridToGeodesic(data.frame(easting = data$eastingRounded, northing = data$northingRounded))
    data <- data[, !(names(data) %in% c('northingRounded', 'eastingRounded'))]

    # I calculate the coordinates of Davetaz's square the incident belongs to
    data[, c("davetazLatitude", "davetazLongitude") ] <- cbind(
        data$latitude %/% DAVETAZ_SQUARE_LATITUDE_SIZE * DAVETAZ_SQUARE_LATITUDE_SIZE,
        data$longitude %/% DAVETAZ_SQUARE_LONGITUDE_SIZE * DAVETAZ_SQUARE_LONGITUDE_SIZE
        )    
    
    data
}

incidents.preprocess.saveByBorough <- function (incidents, filenamePrefix = "byBorough/") {
    for (b in unique(incidents$borough)) {
        write.table(subset(incidents, borough == b), file = paste(filenamePrefix, b, ".csv", sep = ""), row.names = FALSE, sep = ',', na = 'NULL')
    }
}


incidents.preprocess.save <- function (incidents, filename = "incidents.csv") {
    write.table(incidents, file = filename, row.names = FALSE, sep = ',', na = 'NULL')
}


# Enhances the input incidents data frame by (re-)identifying its closest 
# Telefonica 'output area' using the non-approximated longitude and latitude. 
# Returns the enhanced incidents data frame and removes the non-approximated
# longitude and latitude.
incident.preprocess.addTelefonicaGrid <- function (incidents, telefonicaOutputAreasCSVFile = "../footfall/outputAreas.csv") {

    # returns the row number of the outputAreas data frame that correspond to
    # the closest output area to the given incident
    findClosestOutputArea <- function (incident) {
            distances <- spDistsN1(data.matrix(outputAreas[, c('longitudeCentre', 'latitudeCentre')]), matrix(c(incident$longitude, incident$latitude), nrow = 1, ncol = 2, byrow = TRUE), longlat = TRUE)
            # Note: if more than one output area is equally distant from the 
            # incident, the first is arbitrarily taken. We may want to change that
            # (R newbies read http://stackoverflow.com/a/5577776 )
            match(min(distances), distances)
        }

    library(sp)
    outputAreas <- read.csv(telefonicaOutputAreasCSVFile, header = TRUE, colClasses = structure(c("factor", "numeric", "numeric", "numeric")))
    temp <- sapply(1:nrow(incidents), function (i) { findClosestOutputArea(incidents[i, ]) })
    incidents$telefonicaGridId <- outputAreas$telefonicaGridId[temp]
    incidents[, !(names(incidents) %in% c('longitude', 'latitude'))]
}


# adds footfall information and removes the Telefonica grid id
incidents.preprocess.addFootfall <- function (incidents, telefonicaFootfallCSVFile = "../footfall/footfall.csv") {

    findFootfall <- function (g, d, t) {
        footfall[ (footfall$telefonicaGridId == g) & (footfall$day == d) & (footfall$time == t), c('footfallDensity') ]
    }

    library(plyr)
    footfall <- read.csv(telefonicaFootfallCSVFile, header = TRUE, colClasses = structure(c("factor", "factor", "factor", "numeric")))
    print("finished reading")
    incidents$day <- weekdays(incidents$date)
    incidents <- ddply(incidents, .(telefonicaGridId, day, time), function (df) {
        df$footfall <- findFootfall(df[1, ]$telefonicaGridId, df[1, ]$day, df[1, ]$time)
        df    
    })
    incidents[, !(names(incidents) %in% c('telefonicaGridId', 'day'))]
}


# TODO: not tested, and the scoring formula is provisional
incidents.preprocess.addScore <- function (incidents) {
    # One incident scores 100% if it had the highest footfall / attendance time
    # ratio. The +1 is arbitrarily added not to make the function fail in case
    # any incident had 0 response time (e.g. any non-sanitised data)
    MAX_FOOTFALL <- max(incidents$footfall)
    MIN_FIRST_PUMP_TIME <- min(incidents$firstPumpTime)
    # first pass, not-normaised score 
    incidents$score <- log(1 + incidents$footfall) / log(1 + incidents$firstPumpTime) 
    # second pass, normalisation and rounding
    incidents$score <- round(incidents$score / max(incidents$score), 2)
    incidents
}


# Equivalent to "getStationResponseTime" in the website 'data.js' *and*
# vectorised. 
test.getWardResponseTime <- function (wardNames, closedStationsNames = c( )) {
    sapply(wardNames, function (w) { 
        mean(subset(incidents, (ward == w) & !(firstPumpStation %in% closedStationsNames))$firstPumpTime)
    })
}

# Equivalent to "getStationsInBorough in the website's "data.js".
test.getStationsInBorough <- function (boroughName) {
    # TODO: still need to understand why I need to as.character the result
    # to use it in test.getBoroughResponseTime below
    as.character(unique(subset(stations, borough == boroughName)$name));
}

# Equivalent to "getBoroughResponseTime" in the website's "data.js" *and*
# vectorised
test.getBoroughResponseTime <- function (boroughName, closedStationsNames = c( )) {

    # Below is the old version, before Giacecco and Ulrich decided it was 
    # to redefine borough response time. 
    #
    # stations <- test.getStationsInBorough(boroughName)
    # notClosedStations <- stations[ !(stations %in% closedStationsNames) ]
    # mean(data.frame(notClosedStations, mean = test.getWardResponseTime(notClosedStations, closedStations))$mean)

    # ... and here is the new version
    sapply(boroughNames, function (b) {
        mean(subset(incidents, (borough == b) & !(firstPumpStation %in% closedStationsNames))$firstPumpTime)
    })

}
