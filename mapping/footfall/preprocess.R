print ("Pre-processing the footfall data for Dec '12 and May '13...")
source("preprocessFootfall.R")
footfall <- preprocessFootfall()
write.table(footfall, file = "footfall.csv", row.names = FALSE, sep = ',')

print ("Pre-processing the 'output areas' definitions, that is, the grid's areas")
source("preprocessOutputAreas.R")
outputAreas <- preprocessOutputAreas()
write.table(outputAreas, file = "outputAreas.csv", row.names = FALSE, sep = ',')

# source("preprocessIncidents.R")
# incidents <- preprocessIncidents(outputAreas)
# write.table(incidents, file = "incidents.csv", row.names = FALSE, sep = ',', na = 'NULL')
