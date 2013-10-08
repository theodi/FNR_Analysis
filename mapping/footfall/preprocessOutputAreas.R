preprocessOutputAreas <- function () {

	# The average latitude of the output areas for London is 51.52447 degrees. I use
	# that to approximate the length of a degree of latitude and longitude across 
	# the whole of London. The result is below. The calculation is courtesy of 
	# http://www.csgnetwork.com/degreelenllavcalc.html 
	# TODO: double-check results with alternative source
	LENGTH_OF_A_DEGREE_OF_LATITUDE <- 111.25826132219737 # km
	LENGTH_OF_A_DEGREE_OF_LONGITUDE <- 69.4032968251825 # km

	outputAreas <- read.csv("../../reference data/Telefonica/telefonica-output-areas.csv.gz")
	colnames(outputAreas) <- c("telefonicaGridId", "longitudeCentre", "latitudeCentre", "areaSqKm")
	# I remove from the areas the rows referring to grid ids that are not listed
	# in the December data
	dec09 <- read.csv("../../reference data/Telefonica/footfall-London-09-dec-2012-15-dec-2012.csv.gz")
	outputAreas <- subset(outputAreas, telefonicaGridId %in% dec09$Grid_ID)
	# I calculate the areas' width and height in degrees, assuming they are squared
	outputAreas$width <- sqrt(outputAreas$areaSqKm) / LENGTH_OF_A_DEGREE_OF_LONGITUDE
	outputAreas$heigth <- sqrt(outputAreas$areaSqKm) / LENGTH_OF_A_DEGREE_OF_LATITUDE
	# I force the class of the columns and fix the formats if necessary
	outputAreas$telefonicaGridId <- as.factor(outputAreas$telefonicaGridId)
	outputAreas[, !(names(outputAreas) %in% c('areaSqKm'))]

}