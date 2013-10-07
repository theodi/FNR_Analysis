# We won't use the whole of Telefonica's footfall data. We would like to 
# represent the average London week in 2012 by using one week in May and one in 
# December. The data needs some pre-processing as it was generated in different
# times by different Telefonica analysts. 
# TODO: TO BE RE-WRITTEN AFTER WE GET THE FINAL DATA FROM TELEFONICA

dec09 <- read.csv("../../reference data/Telefonica/footfall-London-09-dec-2012-15-dec-2012.csv.gz")
dec09 <- dec09[, c('Date', 'Time', 'Grid_ID', 'Total')]
colnames(dec09) <- c("date", "time", "telefonicaGridId", "footfall")
# December's dates need being converted to R's format
dec09$date <- as.Date(dec09$date, "%d/%m/%Y")
dec09$time <- as.character(dec09$time)

may13 <- read.csv("../../reference data/Telefonica/footfall-UK-13-may-2013-16-may-2013.csv.gz")
may13 <- may13[, c('Date', 'Time', 'Grid.ID', 'Total')]
colnames(may13) <- c("date", "time", "telefonicaGridId", "footfall")
# I remove from the May data the rows referring to grid ids that are not listed
# in the December data
may13 <- subset(may13, telefonicaGridId %in% dec09$telefonicaGridId)
may13$date <- as.Date(may13$date)
# May's times need being converted to R's format
may13$time <- paste(may13$time, ":00", sep = "", collapse = NULL)

data <- rbind(may13, dec09)