# this was prepared following the general instructions by Bloomberg School 
# of Public Health's prof. Roger Peng, in Coursera's course "Computing for Data 
# Analysis" (23/9/2013), "Reading and Writing Data" unit, slide 7
structure(c("integer", "character", "character", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "factor", "integer", "integer", "integer", "integer", "factor", "factor", "integer", "factor", "factor", "factor", "integer", "integer"), .Names = c("IncidentNumber", "DateOfCall", "TimeOfCall", "IncidentGroup", "StopCodeDescription", "SpecialServiceType", "PropertyCategory", "PropertyType", "AddressQualifier", "Postcode_full", "Postcode_district", "WardCode", "WardName", "BoroughCode", "BoroughName", "Easting_m", "Northing_m", "Easting_rounded", "Northing_rounded", "FRS", "IncidentStationGround", "FirstPumpArriving_AttendanceTime", "FirstPumpArriving_DeployedFromStation", "SecondPumpArriving_AttendanceTime", "SecondPumpArriving_DeployedFromStation", "NumStationsWithPumpsAttending", "NumPumpsAttending"))

# I read the original data, but for Google Refine's pre-selection of 2012
# only and conversion of dates
data <- read.csv("../../reference data/LFB data 1 Jan 2009 to 31 Mar 2013.csv", header = TRUE, sep = ',', colClasses = classes, na.strings = 'NULL')

# I drop the columns I don't need
data_relevant_columns_only <- data[ c('DateOfCall', 'IncidentGroup', 'Easting_rounded', 'Northing_rounded', 'IncidentStationGround', 'FirstPumpArriving_AttendanceTime', 'FirstPumpArriving_DeployedFromStation', 'SecondPumpArriving_AttendanceTime', 'SecondPumpArriving_DeployedFromStation') ]

# I drop the rows that have NULL values in columns I need
data_not_NULL <- subset(data_relevant_columns_only, FirstPumpArriving_AttendanceTime != 'NULL' & Easting_rounded != 'NULL' & Northing_rounded != 'NULL')


