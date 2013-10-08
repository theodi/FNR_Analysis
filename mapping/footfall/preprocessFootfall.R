fixMissingFootfall <- function (data) {

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


preprocessFootfall <- function () {

	# We won't use the whole of Telefonica's footfall data. We would like to 
	# represent the average London week by using one week in December '12 and one 
	# in May '13. The data needs some pre-processing as it was generated in 
	# different times by different Telefonica analysts. 

	dec09 <- read.csv("../../reference data/Telefonica/footfall-London-09-dec-2012-15-dec-2012.csv.gz")
	dec09 <- dec09[, c('Date', 'Time', 'Grid_ID', 'Total')]
	colnames(dec09) <- c("date", "time", "telefonicaGridId", "footfall")
	# remove any duplicates
	dec09 <- dec09[!duplicated(paste(dec09$telefonicaGridId, dec09$date, dec09$time, dec09$footfall)),]
	# I force the class of the columns and fix the formats if necessary
	dec09$telefonicaGridId <- as.factor(dec09$telefonicaGridId)
	# December's dates need being converted to R's format
	dec09$date <- as.Date(dec09$date, "%d/%m/%Y")
	dec09$time <- as.factor(dec09$time)
	dec09$day <- weekdays(as.Date(dec09$date))
	dec09$day <- as.factor(dec09$day)
	dec09 <- dec09[, c("telefonicaGridId", "day", "time", "footfall")]
	# I fill in for any missing data
	dec09 <- fixMissingFootfall(dec09)


	may13 <- read.csv("../../reference data/Telefonica/footfall-UK-13-may-2013-19-may-2013.csv.gz")
	may13 <- may13[, c('Date', 'Time', 'Grid.ID', 'Total')]
	colnames(may13) <- c("date", "time", "telefonicaGridId", "footfall")
	# I remove from the May data the rows referring to grid ids that are not listed
	# in the December data
	may13 <- subset(may13, telefonicaGridId %in% dec09$telefonicaGridId)
	# remove any duplicates
	may13 <- may13[!duplicated(paste(may13$telefonicaGridId, may13$date, may13$time, may13$footfall)),]
	# I force the class of the columns and fix the formats if necessary
	may13$telefonicaGridId <- as.factor(may13$telefonicaGridId)
	may13$date <- as.Date(may13$date)
	may13$time <- paste(may13$time, ":00", sep = "", collapse = NULL)
	may13$time <- as.factor(may13$time)
	may13$day <- weekdays(as.Date(may13$date))
	may13$day <- as.factor(may13$day)
	may13 <- may13[, c("telefonicaGridId", "day", "time", "footfall")]
	# I fill in for any missing data
	may13 <- fixMissingFootfall(may13)

	# I merge Dec '12 and May '13 data
	data <- rbind(may13, dec09)

	# ... and calculate the footfall mean for every grid id, day of week and 
	# hour 
	# TODO: there must be an incredible better way for doing what the next 
	# section does
	footfall <- lapply(split(data$footfall, list(data$telefonicaGridId, data$day, data$time)), mean)
	footfall <- do.call(rbind.data.frame, footfall)
	colnames(footfall) <- c('mean')
	footfall$temp <- rownames(footfall)
	footfall$telefonicaGridId <- sapply(footfall$temp, function (x) { unlist(strsplit(x, "[.]"))[1] })
	footfall$day <- sapply(footfall$temp, function (x) { unlist(strsplit(x, "[.]"))[2] })
	footfall$time <- sapply(footfall$temp, function (x) { unlist(strsplit(x, "[.]"))[3] })
	footfall[, c('telefonicaGridId', 'day', 'time', 'mean')]

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

