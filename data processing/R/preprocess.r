# this was prepared following the general instructions by Bloomberg School 
# of Public Health's prof. Roger Peng, in Coursera's course "Computing for Data 
# Analysis" (23/9/2013), "Reading and Writing Data" unit, slide 7
classes <- structure(c("integer", "character", "character", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "integer", "integer", "integer", "integer", "factor", "factor", "integer", "factor", "factor", "factor", "integer", "integer"), .Names = c("IncidentNumber", "DateOfCall", "TimeOfCall", "IncidentGroup", "StopCodeDescription", "SpecialServiceType", "PropertyCategory", "PropertyType", "AddressQualifier", "Postcode_full", "Postcode_district", "WardCode", "WardName", "BoroughCode", "BoroughName", "Easting_m", "Northing_m", "Easting_rounded", "Northing_rounded", "FRS", "IncidentStationGround", "FirstPumpArriving_AttendanceTime", "FirstPumpArriving_DeployedFromStation", "SecondPumpArriving_AttendanceTime", "SecondPumpArriving_DeployedFromStation", "NumStationsWithPumpsAttending", "NumPumpsAttending"))

# I read the original data (no need for Google Refine, as for the Javascript 
# version)
data <- read.csv("../../reference data/LFB data 1 Jan 2009 to 31 Mar 2013.csv.gz", header = TRUE, sep = ',', colClasses = classes, na.strings = 'NULL')

# I drop the columns I don't need
data <- data[ c('DateOfCall', 'IncidentGroup', 'Easting_rounded', 'Northing_rounded', 'IncidentStationGround', 'FirstPumpArriving_AttendanceTime', 'FirstPumpArriving_DeployedFromStation', 'SecondPumpArriving_AttendanceTime', 'SecondPumpArriving_DeployedFromStation') ]

# I drop the rows that have NULL values in columns I need
data <- subset(data, FirstPumpArriving_AttendanceTime != 'NULL' & Easting_rounded != 'NULL' & Northing_rounded != 'NULL')

# more goes here, e.g. date conversion and consolidation of date and time 
# columns

# and save it, for the d3js in the website to use it
write.table(data_not_NULL, file = "LFB 2012 preprocessed.csv")
