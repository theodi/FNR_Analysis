incidents.preprocess.REFERENCE_DATA <- "../../reference data/LFB/LFB data 1 Jan 2009 to 31 Mar 2013.csv.gz"

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
    # and drop the original coordinates
    data[, c("simplifiedLatitude", "simplifiedLongitude") ] <- cbind(
        data$latitude %/% SIMPLIFIED_SQUARE_LATITUDE_SIZE * SIMPLIFIED_SQUARE_LATITUDE_SIZE,
        data$longitude %/% SIMPLIFIED_SQUARE_LONGITUDE_SIZE * SIMPLIFIED_SQUARE_LONGITUDE_SIZE
        )    
    data <- data[, !(names(data) %in% c("latitude", "longitude"))]

    data
}

incidents.preprocess.saveByBorough <- function (incidents, filenamePrefix = "byBorough/") {
    for (b in unique(incidents$borough)) {
        write.table(subset(incidents, borough == b), file = paste(filenamePrefix, b, ".csv", sep = ""), row.names = FALSE, sep = ',', na = 'NULL')
    }
}


# Enhances the input incidents data frame by (re-)identifying its closest 
# Telefonica 'output area' using the non-approximated longitude and latitude. 
# Returns the enhanced incidents data frame and removes the non-approximated
# longitude and latitude.
incidents.preprocess.addTelefonicaGrid <- function (incidents, outputAreas = data.frame(), telefonicaOutputAreasCSVFile = "../footfall/outputAreas.csv") {

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
    if (nrow(outputAreas) == 0) {
        outputAreas <- read.csv(telefonicaOutputAreasCSVFile, header = TRUE, colClasses = structure(c("factor", "numeric", "numeric", "numeric")))
    }
    incidents <- data.table(incidents)
    incidents <- incidents[, list(date, time, incidentGroup, borough, ward, firstPumpTime, firstPumpStation, telefonicaGridId = findClosestOutputArea(simplifiedLongitude, simplifiedLatitude)), by = 'simplifiedLongitude,simplifiedLatitude' ]
    data.frame(incidents)
}


# adds footfall information and removes the Telefonica grid id
incidents.preprocess.addFootfall <- function (incidents, footfall = data.frame(), telefonicaFootfallCSVFile = "../footfall/footfall.csv", showProgress = FALSE) {

    # I read the reference footfall data, if no data frame is specified
    if (nrow(footfall) == 0) {
        footfall <- read.csv(telefonicaFootfallCSVFile, header = TRUE, colClasses = structure(c("factor", "factor", "factor", "numeric")))
    }
    results <- data.frame()
    # I drop all footfall I am not going to use
    footfall <- footfall[ footfall$telefonicaGridId %in% incidents$telefonicaGridId, ]
    # I round it to the closest integer
    footfall$footfallDensity <- round(footfall$footfallDensity, 0)
    if (showProgress) {
        noOfTelefonicaGridIds <- length(unique(incidents$telefonicaGridId))
        counter <- 0
    }
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


scoring.run <- function (incidents, closedStationsNames = c( )) {
    # I aggregate the incidents in the square they belong to, using the median 
    # of response time and footfall as the square's characteristics 
    incidents <- data.table(incidents)
    incidents$firstPumpTime <- as.numeric(incidents$firstPumpTime)
    incidents$footfall <- as.numeric(incidents$footfall)
    boroughs <- incidents[ !(firstPumpStation %in% closedStationsNames), list(firstPumpTime = median(firstPumpTime), footfall = median(footfall)), by="borough"]
    boroughs$ZFootfall <- scale(log(boroughs$footfall + 1), center=TRUE, scale=TRUE)
    boroughs$ZFirstPumpTime <- scale(boroughs$firstPumpTime, center=TRUE, scale=TRUE)
    if (length(closedStationsNames) == 0) {
        boroughs$score <- .5 * boroughs$ZFootfall + .5 * boroughs$ZFirstPumpTime 
    } else {
        boroughs$score <- pmin(scoring.run(incidents)$score, .5 * boroughs$ZFootfall + .5 * boroughs$ZFirstPumpTime) 
    }
    data.frame(boroughs)[ , names(boroughs) %in% c('borough', 'score') ]
}


test.BOROUGH_NAMES <- c("Barking and Dagenham", "Barnet", "Bexley", "Brent", "Bromley", "Camden", "City of London", "Croydon", "Ealing", "Enfield", "Greenwich", "Hackney", "Hammersmith and Fulham", "Haringey", "Harrow", "Havering", "Hillingdon", "Hounslow", "Islington", "Kensington and Chelsea", "Kingston upon Thames", "Lambeth", "Lewisham", "Merton", "Newham", "Redbridge", "Richmond upon Thames", "Southwark", "Sutton", "Tower Hamlets", "Waltham Forest", "Wandsworth", "Westminster")

test.STATIONS_FACING_CLOSURE_NAMES <- c("Belsize", "Bow", "Clerkenwell", "Downham", "Kingsland", "Knightsbridge", "Silvertown", "Southwark", "Westminster", "Woolwich")

test.DAVETAZ_SELECTED_STATION_NAMES <- c("Addington", "Barnet", "Chingford", "Woodford", "Bromley", "Surbiton", "Croydon", "Richmond", "Romford", "Wandsworth")


# Equivalent to "getStationsInBorough in the website's "data.js".
test.getStationsInBorough <- function (boroughName) {
    # TODO: still need to understand why I need to as.character the result
    # to use it in test.getBoroughResponseTime below
    as.character(unique(subset(stations, borough == boroughName)$name));
}


# Equivalent to "getBoroughResponseTime" in the website's "data.js" 
test.getBoroughResponseTime <- function (incidents, b, closedStationsNames = c( )) {
    if (length(closedStationsNames) == 0) {
        mean(subset(incidents, borough == b)$firstPumpTime)
    } else {
        max(test.getBoroughResponseTime(incidents, b), mean(subset(incidents, (borough == b) & !(firstPumpStation %in% closedStationsNames))$firstPumpTime))
    }
}


test.getBoroughResponseTime.OLD <- function (b, closedStationsNames = c( )) {
    mean(subset(incidents, (borough == b) & !(firstPumpStation %in% closedStationsNames))$firstPumpTime)
}


test.foo <- function (incidents) {
    results <- data.frame()
    for (borough in unique(incidents$borough)) {
        results <- rbind(results, c( borough = borough, responseTime = test.getBoroughResponseTime(incidents, borough) ))
    }
    results
} 