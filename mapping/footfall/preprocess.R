source("preprocessFootfall.R")
footfall <- preprocessFootfall()
write.table(footfall, file = "footfall.csv", row.names = FALSE, sep = ',')

source("preprocessOutputAreas.R")
outputAreas <- preprocessOutputAreas()
write.table(outputAreas, file = "outputAreas.csv", row.names = FALSE, sep = ',')

source("preprocessIncidents.R")
incidents <- preprocessIncidents(outputAreas)
write.table(incidents, file = "incidents.csv", row.names = FALSE, sep = ',', na = 'NULL')
