# We won't use the whole of Telefonica's footfall data. We would like to 
# represent the average London week by using one week in December '12 and one 
# in May '13. The data needs some pre-processing as it was generated in 
# different times by different Telefonica analysts. 

dec09 <- read.csv("../../reference data/Telefonica/footfall-London-09-dec-2012-15-dec-2012.csv.gz")
dec09 <- dec09[, c('Date', 'Time', 'Grid_ID', 'Total')]
colnames(dec09) <- c("date", "time", "telefonicaGridId", "footfall")
dec09$telefonicaGridId <- as.factor(dec09$telefonicaGridId)
# December's dates need being converted to R's format
dec09$date <- as.Date(dec09$date, "%d/%m/%Y")
dec09$time <- as.factor(dec09$time)
dec09$day <- weekdays(as.Date(dec09$date))
dec09$day <- as.factor(dec09$day)
dec09 <- dec09[, c("telefonicaGridId", "day", "time", "footfall")]

may13 <- read.csv("../../reference data/Telefonica/footfall-UK-13-may-2013-19-may-2013.csv.gz")
may13 <- may13[, c('Date', 'Time', 'Grid.ID', 'Total')]
colnames(may13) <- c("date", "time", "telefonicaGridId", "footfall")
# I remove from the May data the rows referring to grid ids that are not listed
# in the December data
may13 <- subset(may13, telefonicaGridId %in% dec09$telefonicaGridId)
may13$telefonicaGridId <- as.factor(may13$telefonicaGridId)
may13$date <- as.Date(may13$date)
# May's times need being converted to R's format
may13$time <- paste(may13$time, ":00", sep = "", collapse = NULL)
may13$time <- as.factor(may13$time)
may13$day <- weekdays(as.Date(may13$date))
may13$day <- as.factor(may13$day)
may13 <- may13[, c("telefonicaGridId", "day", "time", "footfall")]

data <- rbind(may13, dec09)
write.table(data, file = "footfall.csv", row.names = FALSE, sep = ',')

outputAreas <- read.csv("../../reference data/Telefonica/telefonica-output-areas.csv.gz")
colnames(outputAreas) <- c("telefonicaGridId", "longitudeCentre", "latitudeCentre", "areaSqM")
# I remove from the areas the rows referring to grid ids that are not listed
# in the December data
outputAreas <- subset(outputAreas, telefonicaGridId %in% dec09$telefonicaGridId)
write.table(outputAreas, file = "londonOutputAreas.csv", row.names = FALSE, sep = ',')
