classFix <- function (telefonicaDataFrame) {
	for (columnName in c("Grid_Area", "Total", "at_home", "at_work", "visiting", "male", "female", "age_0_20", "age_21_30", "age_31_40", "age_41_50", "age_51_60", "age_over_60")) {
		telefonicaDataFrame[, columnName] <- as.numeric(telefonicaDataFrame[, columnName])
	}
	telefonicaDataFrame
}

# We won't use the whole of Telefonica's footfall data. We would like to 
# represent the average London week in 2012 by using one week in May and one in 
# December. The data needs some pre-processing as it was generated in different
# times by different Telefonica analysts. 
# TODO: TO BE RE-WRITTEN AFTER WE GET THE FINAL DATA FROM TELEFONICA

dec09 <- read.csv("../../reference data/Telefonica/footfall-London-09-dec-2012-15-dec-2012.csv.gz")
dec09 <- dec09[, c('Date', 'Time', 'Grid_ID', 'Total')]
# December's dates need being converted to R's format
dec09$Date <- as.Date(dec09$Date, "%Y/%b/%d")
colnames(dec09) <- c("date", "time", "telefonicaGridId", "footfall")

may13 <- read.csv("../../reference data/Telefonica/footfall-UK-13-may-2012-16-may-2012.csv.gz")
may13 <- may13[, c('Date', 'Time', 'Grid.ID', 'Total')]
colnames(may13) <- c("date", "time", "telefonicaGridId", "footfall")
# I remove from the May data the rows referring to grid ids that are not listed
# in the December data
may13 <- subset(may13, telefonicaGridId %in% dec09$telefonicaGridId)

data <- rbind(may13, dec09)