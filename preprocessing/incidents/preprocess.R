preprocess.REFERENCE_DATA = "../../reference data/LFB/LFB data 1 Jan 2009 to 31 Mar 2013.csv.gz"

preprocess.run <- function (filename = preprocess.REFERENCE_DATA) {

    source("./OSGridToGeodesic.R")
    
    # this was prepared following the general instructions by Bloomberg School 
    # of Public Health's prof. Roger Peng, in Coursera's course "Computing for Data 
    # Analysis" (23/9/2013), "Reading and Writing Data" unit, slide 7
    classes <- structure(c("integer", "character", "character", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "integer", "integer", "integer", "integer", "factor", "factor", "integer", "factor", "integer", "factor", "integer", "integer"), .Names = c("IncidentNumber", "DateOfCall", "TimeOfCall", "IncidentGroup", "StopCodeDescription", "SpecialServiceType", "PropertyCategory", "PropertyType", "AddressQualifier", "Postcode_full", "Postcode_district", "WardCode", "WardName", "BoroughCode", "BoroughName", "Easting_m", "Northing_m", "Easting_rounded", "Northing_rounded", "FRS", "IncidentStationGround", "FirstPumpArriving_AttendanceTime", "FirstPumpArriving_DeployedFromStation", "SecondPumpArriving_AttendanceTime", "SecondPumpArriving_DeployedFromStation", "NumStationsWithPumpsAttending", "NumPumpsAttending"))
    
    # I read the original data (no need for Google Refine, as for the Javascript 
    # version)
    data <- read.csv(filename, header = TRUE, sep = ',', colClasses = classes, na.strings = 'NULL')
    
    # I drop a) the rows that have NULL values in columns I need (not all rows with 
    # NULL values!), and b) the columns I don't need
    data <- subset(data, !is.na(FirstPumpArriving_AttendanceTime) & !is.na(Easting_rounded) & !is.na(Northing_rounded), c('DateOfCall', 'TimeOfCall', 'IncidentGroup', 'WardName', 'Easting_rounded', 'Northing_rounded', 'IncidentStationGround', 'FirstPumpArriving_AttendanceTime', 'FirstPumpArriving_DeployedFromStation', 'SecondPumpArriving_AttendanceTime', 'SecondPumpArriving_DeployedFromStation'))
    
    # I rename the columns
    colnames(data) <- c('date', 'time', 'incidentGroup', 'borough', 'eastingRounded', 'northingRounded', 'station', 'firstPumpTime', 'firstPumpStation', 'secondPumpTime', 'secondPumpStation')
    
    # I convert dates to R's format, thanks to instructions at 
    # http://www.ats.ucla.edu/stat/r/faq/string_dates.htm
    data$date <- as.Date(data$date, "%d-%b-%y")
    
    # I filter out everything is not from 2012
#    data <- subset(data, (date >= '2012-01-01') & (date <= '2012-12-31'))
    
    # I convert the incidents' OS Grid coordinates to geodesic and drop the orignal
    # ones
    data[, c("latitude", "longitude")] <- OSGridToGeodesic(data.frame(easting = data$eastingRounded, northing = data$northingRounded))
    data <- data[, !(names(data) %in% c('northingRounded', 'eastingRounded'))]
    
    data
}

preprocess.save <- function (filename = "incidents.csv") {
    write.table(preprocess.run(), file = filename, row.names = FALSE, sep = ',', na = 'NULL')
}