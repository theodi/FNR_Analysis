footfall.preprocess.TELEFONICA_REFERENCE_DATA_FOLDER <- "../data/sources/Telefonica"


# Note that the December 2012 and May 2015 datasets require different 
# functions to clean-up and harmonise, as they have slightly different formats
# and issues. 
footfall.preprocess.readDec2012 <- function (filenames = c("footfall-09-dec-2012-15-dec-2012.csv.gz")) {
		data = data.frame()
	for (filename in filenames) {
		temp <- read.csv(paste(footfall.preprocess.TELEFONICA_REFERENCE_DATA_FOLDER, "/", filename, sep = ""))
		temp <- temp[, c('Date', 'Time', 'Grid_ID', 'Total')]
		colnames(temp) <- c("date", "time", "telefonicaGridId", "footfall")
		# remove any duplicates
		temp <- temp[!duplicated(paste(temp$telefonicaGridId, temp$date, temp$time, temp$footfall)),]
		# I force the class of the columns and fix the formats if necessary
		temp$telefonicaGridId <- as.factor(temp$telefonicaGridId)
		# December's dates need being converted to R's format
		temp$date <- as.Date(temp$date, "%d/%m/%Y")
		temp$time <- as.factor(as.numeric(sapply(temp$time, function (t) { unlist(strsplit(as.character(t), ":"))[1] })))
		temp$day <- as.factor(weekdays(as.Date(temp$date)))
		temp$footfall <- as.numeric(temp$footfall)
		temp <- temp[, c("telefonicaGridId", "day", "time", "footfall")]
		data <- rbind(data, temp)
	}
	data
}


# Note that the December 2012 and May 2015 datasets require different 
# functions to clean-up and harmonise, as they have slightly different formats
# and issues. 
footfall.preprocess.readMay2013 <- function (filenames = c("footfall-13-may-2013-19-may-2013.csv.gz")) {
		data = data.frame()
	for (filename in filenames) {
		temp <- read.csv(paste(footfall.preprocess.TELEFONICA_REFERENCE_DATA_FOLDER, "/", filename, sep = ""))	
		temp <- temp[, c('Date', 'Time', 'Grid.ID', 'Total')]
		colnames(temp) <- c("date", "time", "telefonicaGridId", "footfall")
		# remove any duplicates
		temp <- temp[!duplicated(paste(temp$telefonicaGridId, temp$date, temp$time, temp$footfall)),]
		# I force the class of the columns and fix the formats if necessary
		temp$telefonicaGridId <- as.factor(temp$telefonicaGridId)
		temp$date <- as.Date(temp$date)
		temp$time <- as.factor(as.numeric(sapply(temp$time, function (t) { unlist(strsplit(as.character(t), ":"))[1] })))
		temp$day <- as.factor(weekdays(as.Date(temp$date)))
		temp$footfall <- as.numeric(temp$footfall)
		temp <- temp[, c("telefonicaGridId", "day", "time", "footfall")]
		data <- rbind(data, temp)
	}
	data
}


# I remove any area whose footfall information is missing partly or completely. 
# The second nearest Telefonica area will be used for calculations.
footfall.preprocess.fixMissingFootfall <- function (footfall) {
	missingAreas <- c()
	for (d in unique(footfall$day)) {
		dataForDay <- subset(footfall, day == d)
		noOfRecordsPerArea <- sapply(split(dataForDay$time, dataForDay$telefonicaGridId), length)
		missingAreas <- c(missingAreas, names(noOfRecordsPerArea[noOfRecordsPerArea < 24]))
	}
	missingAreas
	footfall[ !(footfall$telefonicaGridId %in% missingAreas), ]
}


# Produces one line per Telefonica grid id per day per hour from 
# footfall data replacing each sample's footfall with their average, typically
# fro data sets that cover more weeks 
footfall.preprocess.consolidate <- function (footfall) {
	library(data.table)
	footfall <- data.table(footfall)
	footfall[, list(footfall = mean(footfall)), by = 'telefonicaGridId,day,time']
	data.frame(footfall)
}


# creates a footfall data frame replacing the grid id with its
# 'footfall density', calculated vs the area of a 'Davetaz square'
# TODO: this is broken
footfall.preprocess.addFootfallDensity <- function (footfall, outputAreas) {
	temp <- merge(x = footfall, y = outputAreas, all.x = TRUE)
	temp$footfallDensity <- temp$footfall / temp$area
	temp[, names(temp) %in% c("telefonicaGridId", "day", "time", "footfallDensity")]
}


footfall.preprocess.save <- function (footfall, filename = "footfall.csv") {
	write.table(footfall, file = filename, row.names = FALSE, sep = ',')
}



