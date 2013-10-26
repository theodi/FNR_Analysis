# To import the data in mongo, from the command line
mongoimport -d fnranalysis -c incidentsData --type csv --file data.csv --headerline
mongoimport -d fnranalysis -c censusData --type csv --file census.csv --headerline

# to add the index, within the mongo console
db.incidentsData.ensureIndex({ "borough": 1});
db.incidentsData.ensureIndex({ "firstPumpStation": 1});
db.incidentsData.ensureIndex({ "borough": 1, "firstPumpStation": 1});
// Index below is not used any longer as performance was worse
// db.incidentsData.ensureIndex({ "firstPumpStation": 1, "simplifiedLongitude": 1, "simplifiedLatitude": 1 });
db.censusData.ensureIndex({ borough: 1});