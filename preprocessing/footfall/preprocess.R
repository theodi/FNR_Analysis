footfall.preprocess.TELEFONICA_REFERENCE_DATA_FOLDER <- "../../../ODI FNR Analysis (private)/reference data/Telefonica"


outputAreas.preprocess.save <- function (outputAreas, filename = "outputAreas.csv") {
	write.table(outputAreas, file = filename, row.names = FALSE, sep = ',')
}


outputAreas.preprocess.readAndClean <- function (relevantGridIDs) {

    # Below is the size in latitude and longitude of the simplified map squares
    # we experimentally identified as relevant for visualisation
    SIMPLIFIED_SQUARE_LATITUDE_SIZE <- 0.001
    SIMPLIFIED_SQUARE_LONGITUDE_SIZE <- 0.0015

	# The average latitude of the output areas for London is 51.52447 degrees. 
	# We use that to approximate the length of a degree of latitude and 
	# longitude across the whole of London. The result is below. The calculation 
	# is courtesy of http://www.csgnetwork.com/degreelenllavcalc.html 
	# TODO: double-check results with alternative source -- DONE!
	LENGTH_OF_A_DEGREE_OF_LATITUDE <- 111.25826132219737 # km
	LENGTH_OF_A_DEGREE_OF_LONGITUDE <- 69.4032968251825 # km

	outputAreas <- read.csv(paste(footfall.preprocess.TELEFONICA_REFERENCE_DATA_FOLDER, "/output-areas.csv.gz", sep = ""))
	colnames(outputAreas) <- c("telefonicaGridId", "longitudeCentre", "latitudeCentre", "areaSqKm")

	# I remove from the areas the rows referring to grid ids that are not listed
	# in the December data
	outputAreas <- subset(outputAreas, telefonicaGridId %in% relevantGridIDs)

	# I replace longitude and latitude with the simplified grid we use for 
	# this exercise
    outputAreas[, c("simplifiedLatitude", "simplifiedLongitude") ] <- cbind(
	    outputAreas$latitude %/% SIMPLIFIED_SQUARE_LATITUDE_SIZE * SIMPLIFIED_SQUARE_LATITUDE_SIZE,
	    outputAreas$longitude %/% SIMPLIFIED_SQUARE_LONGITUDE_SIZE * SIMPLIFIED_SQUARE_LONGITUDE_SIZE
    )    
    outputAreas <- outputAreas[, !(names(outputAreas) %in% c("latitude", "longitude"))]

	# I calculate each output area's dimensions, assuming it is squared
	temp <- sqrt(outputAreas$areaSqKm)
	outputAreas$width <- temp / LENGTH_OF_A_DEGREE_OF_LONGITUDE
	outputAreas$heigth <- temp / LENGTH_OF_A_DEGREE_OF_LATITUDE

	# I calculate the volume of each output areas in 'Davetaz squares': this is 
	# necessarily to later easily calculate the 'footfall density' of a point in
	# the map. 
	# TODO: the calculation below is not completely correct because of the 
	# Earth's curvature, but as we need this to calculate an 'index' rather than
	# the actual area, we can tolerate the issue
    outputAreas$area <- outputAreas$width * outputAreas$heigth / SIMPLIFIED_SQUARE_LONGITUDE_SIZE /SIMPLIFIED_SQUARE_LATITUDE_SIZE

	# I force the class of the columns and fix the formats if necessary
	outputAreas$telefonicaGridId <- as.factor(outputAreas$telefonicaGridId)
	outputAreas[, names(outputAreas) %in% c("telefonicaGridId", "simplifiedLongitude", "simplifiedLatitude", "area")]
}


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



