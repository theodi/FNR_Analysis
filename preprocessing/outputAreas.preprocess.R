outputAreas.preprocess.TELEFONICA_REFERENCE_DATA_FOLDER <- "../data/sources/Telefonica"


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
