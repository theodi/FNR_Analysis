preprocessFootfall.TELEFONICA_REFERENCE_DATA_FOLDER <- "../../../ODI FNR Analysis (private)/reference data/Telefonica"


preprocessOutputAreas.save <- function (filename = "outputAreas.csv") {
	write.table(preprocessOutputAreas.run(), file = filename, row.names = FALSE, sep = ',')
}


preprocessOutputAreas.run <- function (relevantGridIDs = NA) {

    # Below is the size in latitude and longitude of the map square Davetaz
    # has experimentally identified as relevant for visualisation
    DAVETAZ_SQUARE_LATITUDE_SIZE <- 0.001
    DAVETAZ_SQUARE_LONGITUDE_SIZE <- 0.0015

	# The average latitude of the output areas for London is 51.52447 degrees. I use
	# that to approximate the length of a degree of latitude and longitude across 
	# the whole of London. The result is below. The calculation is courtesy of 
	# http://www.csgnetwork.com/degreelenllavcalc.html 
	# TODO: double-check results with alternative source
	LENGTH_OF_A_DEGREE_OF_LATITUDE <- 111.25826132219737 # km
	LENGTH_OF_A_DEGREE_OF_LONGITUDE <- 69.4032968251825 # km

	outputAreas <- read.csv(paste(preprocessFootfall.TELEFONICA_REFERENCE_DATA_FOLDER, "/telefonica-output-areas.csv.gz", sep = ""))
	colnames(outputAreas) <- c("telefonicaGridId", "longitudeCentre", "latitudeCentre", "areaSqKm")
	# I remove from the areas the rows referring to grid ids that are not listed
	# in the December data
	if (!is.na(relevantGridIDs)) relevantGridIDs <- read.csv(paste(preprocessFootfall.TELEFONICA_REFERENCE_DATA_FOLDER, "/footfall-London-09-dec-2012-15-dec-2012.csv.gz", sep = ""))$Grid_ID
	outputAreas <- subset(outputAreas, telefonicaGridId %in% relevantGridIDs)
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
    outputAreas$davetazArea <- outputAreas$width * outputAreas$heigth / DAVETAZ_SQUARE_LONGITUDE_SIZE /DAVETAZ_SQUARE_LATITUDE_SIZE
	# I force the class of the columns and fix the formats if necessary
	outputAreas$telefonicaGridId <- as.factor(outputAreas$telefonicaGridId)
	outputAreas[, names(outputAreas) %in% c("telefonicaGridId", "longitudeCentre", "latitudeCentre", "davetazArea")]
}


preprocessFootfall.fixMissingFootfall <- function (data) {

	# if any area data is missing, even party (e.g. one time slot) for any of 
	# the days, I replace the data for that day in entirety (not just the 
	# missing time slot) with the average footfall of the same kind of day 
	# (weekday / weekend) for the same area, from the days where it is available
	data_fixed <- data
	for (d in unique(data$day)) {
		copyFrom <- if (!(d %in% c('Saturday', 'Sunday'))) c('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday') else c('Saturday', 'Sunday')
		dataForDay <- subset(data, day == d)
		noOfRecordsPerArea <- sapply(split(dataForDay$time, dataForDay$telefonicaGridId), length)
		missingAreas <- names(noOfRecordsPerArea[noOfRecordsPerArea < 24])
		for (a in missingAreas) {
			otherDaysData <- subset(data, (telefonicaGridId == a) & (day %in% copyFrom))
			averages <- sapply(split(otherDaysData$footfall, otherDaysData$time), mean)
			data_fixed <- rbind(data_fixed, cbind(telefonicaGridId = a, day = d, time = names(averages), footfall = averages))
		}
	}
	data_fixed

}


preprocessFootfall.readDec2012 <- function (filenames = c("footfall-London-09-dec-2012-15-dec-2012.csv.gz"), fixMissing = TRUE) {
		data = data.frame()
		for (filename in filenames) {
			temp <- read.csv(paste(preprocessFootfall.TELEFONICA_REFERENCE_DATA_FOLDER, "/", filename, sep = ""))
			temp <- temp[, c('Date', 'Time', 'Grid_ID', 'Total')]
			colnames(temp) <- c("date", "time", "telefonicaGridId", "footfall")
			# remove any duplicates
			temp <- temp[!duplicated(paste(temp$telefonicaGridId, temp$date, temp$time, temp$footfall)),]
			# I force the class of the columns and fix the formats if necessary
			temp$telefonicaGridId <- as.factor(temp$telefonicaGridId)
			# December's dates need being converted to R's format
			temp$date <- as.Date(temp$date, "%d/%m/%Y")
			temp$time <- as.factor(temp$time)
			temp$day <- weekdays(as.Date(temp$date))
			temp$day <- as.factor(temp$day)
			temp$footfall <- as.numeric(temp$footfall)
			temp <- temp[, c("telefonicaGridId", "day", "time", "footfall")]
			# I fill in for any missing data
			if (fixMissing) temp <- preprocessFootfall.fixMissingFootfall(temp)
			data <- rbind(data, temp)
		}
		data
		# TODO: why is footfall character when the data frame is returned by this function?!?!? 
}


# Currently not maintained, as Telefonica may decide that we cannot use the 
# May 2013 data
preprocessFootfall.readMay2013 <- function (filenames = c("footfall-UK-13-may-2013-19-may-2013.csv.gz"), fixMissing = TRUE) {
		data = data.frame()
		for (filename in filenames) {
			temp <- read.csv(paste(preprocessFootfall.TELEFONICA_REFERENCE_DATA_FOLDER, "/", filename, sep = ""))			
			temp <- temp[, c('Date', 'Time', 'Grid.ID', 'Total')]
			colnames(temp) <- c("date", "time", "telefonicaGridId", "footfall")
			# I remove from the May data the rows referring to grid ids that are not listed
			# in the December data
			if (!exists(dec2012)) dec2012 <- preprocessFootfall.readDec2012(fixMissing = FALSE)
			temp <- subset(temp, telefonicaGridId %in% dec09$telefonicaGridId)
			# remove any duplicates
			temp <- temp[!duplicated(paste(temp$telefonicaGridId, temp$date, temp$time, temp$footfall)),]
			# I force the class of the columns and fix the formats if necessary
			temp$telefonicaGridId <- as.factor(temp$telefonicaGridId)
			temp$date <- as.Date(temp$date)
			temp$time <- paste(temp$time, ":00", sep = "", collapse = NULL)
			temp$time <- as.factor(temp$time)
			temp$day <- weekdays(as.Date(temp$date))
			temp$day <- as.factor(temp$day)
			temp$footfall <- as.numeric(temp$footfall)
			temp <- temp[, c("telefonicaGridId", "day", "time", "footfall")]
			# I fill in for any missing data
			if (fixMissing) temp <- preprocessFootfall.fixMissingFootfall(temp)
			data <- rbind(data, temp)
		}
		data
}


# Produces one line per grid per day per hour from non-summarised (but 
# clean) footfall data, typically data sets from more than one week 
preprocessFootfall.consolidate <- function (rawFootfall) {
	library(plyr)
	# if I don't convert the keys to character, ddply fails inexplicably
	rawFootfall$telefonicaGridId <- as.character(rawFootfall$telefonicaGridId)
	rawFootfall$day <- as.character(rawFootfall$day)
	rawFootfall$time <- as.character(rawFootfall$time)
	# Note that I can't run ddply on the entire dataset, as R crashes with a
	# segmentation fault!
	results <- data.frame()
	for (tgi in unique(rawFootfall$telefonicaGridId)) {
		print(paste("Doing grid id", tgi, "..."))
		areaFootfall <- subset(rawFootfall, telefonicaGridId == tgi)
		results <- rbind(results, ddply(areaFootfall, .(telefonicaGridId, day, time), summarise, footfall = mean(footfall)))
	}
	results
}

# creates a footfall data frame replacing the grid id with its
# 'footfall density', calculated vs the area of a 'Davetaz square'
preprocessFootfall.addFootfallDensity <- function (consolidatedFootfall, outputAreas) {
	temp <- merge(x = consolidatedFootfall, y = outputAreas, all.x = TRUE)
	temp$footfallDensity <- temp$footfall / temp$davetazArea
	temp[, names(temp) %in% c("longitudeCentre", "latitudeCentre", "footfallDensity")]
}


# this checks sets that look too small for missing grid areas
checkFootfallCompleteness2 <- function (filename) {

	data <- read.csv(filename)
	allAreas <- unique(data$Grid_ID)
	print (paste("The total number of grid id areas referenced in the file is ", length(allAreas)))
	for (d in unique(data$Date)) {
		print (paste("Checking", d))
		areas <- unique(subset(data, Date == d)$Grid_ID)
		if (length(areas) < length(allAreas)) {
			missingAreas <- allAreas[!(allAreas %in% areas)]
			print ("The missing areas are") 
			print (paste(missingAreas, sep = ", "), sep = " ", collapse = NULL)
		}
	}

}


# same as checkFootfallCompleteness2, but for the May 13 data
checkFootfallCompleteness3 <- function (data) {

	allAreas <- unique(data$Grid.ID)
	print (paste("The total number of grid id areas referenced in the file is ", length(allAreas)))
	for (d in unique(data$Date)) {
		print (paste("Checking", d))
		areas <- unique(subset(data, Date == d)$Grid.ID)
		if (length(areas) < length(allAreas)) {
			missingAreas <- allAreas[!(allAreas %in% areas)]
			print ("The missing areas are") 
			print (paste(missingAreas, sep = ", "), sep = " ", collapse = NULL)
		}
	}

}

