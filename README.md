#ODI Summit 2013 - London fire stations project
This is the repository for the [Open Data Institute](http://theodi.org/) "London fire stations project" presented during the ODI summit on 29 October 2013. It includes two branches:
- the [_master_](https://github.com/theodi/FNR_Analysis/tree/master) branch includes the data  preprocessing scripts and the API server 
- the [_gh-pages_](https://github.com/theodi/FNR_Analysis/tree/gh-pages) branch is the website that you can visit at [http://london-fire.labs.theodi.org/](http://london-fire.labs.theodi.org/), including the client-side code for the interactive map.

##Setup instructions

###Dependencies
All software distributed in this repository is written in either R or Node.js. 

All R scripts have been tested vs version 3.0.2 of the interpreter on MacOS 10.8.5. The comments in the source code for each of the functions explain how to use them. The function signatures often include working default values, e.g. the relative position of the input files they have to be applied to.

For instructions on how to run R see [here](http://cran.r-project.org/doc/manuals/r-release/R-admin.html#Obtaining-R). After installing R, you will have to install packages _rjson_, _sp_ and _data.table_.

All Node.js scripts have been tested vs version 0.10.21 of the interpreter on MacOS 10.8.5. Before execution, all dependencies must be installed by running _npm install_ in the same folder of the scripts. By running the scripts without parameters, e.g. _node stations.preprocess.js_, any required instructions are provided on screen.

For instructions on how to run Node.js see [here](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager). Node.js's package manager _npm_ can be used to install any dependencies.

###Preprocessing
Before the server can be run, all pre-processing activities must be completed according to the data workdflow diagram at [this url](preprocessing/preprocessing%20data%20workflow%20diagram.pdf?raw=true) (PDF).

All source, raw data but for the Telefónica Dynamic Insights files are in this repository at [data/raw](/theodi/FNR_Analysis/tree/master/data/raw). For convenience, [data/preprocessed](/theodi/FNR_Analysis/tree/master/data/processed) instead has copies of all the files expected as the output of the preprocessing stage.

Data must be processed in the same order as indicated by the arrows in the diagrams. The arrows are labelled with the name of the function to be run, e.g. _incidents.preprocess. readAndClean_ corresponds to the function of the same name in the _incidents.preprocess.R_ file in the _preprocessing_ folder. 

The entire preprocessing stage can take several hours to complete due to the volume of the data being processed. The output of the stage is the list of files below:
- To be used by the web client
  - A set of _[borough name].json_ "GeoJSON" files, each of which defines the boroughs' boundaries on the map and stores their default scoring, that is when all stations are open
  - _stations.csv_, with all stations' addresses and coordinates, for displaying on the map 
  - _boroughs_by_first_responders.json_, with the list of stations that supported each of the boroughs' incidents, grouped by borough 
- To be used by the server
  - An _incidents.csv_ file with all pre-processed incident records
  - A _census.csv_ file with the Office for National Statistics' key census information for the boroughs

###Server
The server is a Node.js script, requiring a MongoDB database to read the incidents data from. Before execution, all dependencies must be installed by running _npm install_ in the same folder where _api\_server.js_ and _package.json_ are.

Assuming that we have console access to the database server, we can use the _mongoimport_ utility to load the data in the database, as follows:

    mongoimport -d databaseName -c incidentsData --type csv --file incidents.csv --headerline
    mongoimport -d databaseName -c censusData --type csv --file census.csv --headerline

To optimise the speed of execution, it is necessary to create a few dedicated indexes in the database. Start a MongoDB console session by running:

    mongo databaseName

and then execute the statements listed below:

    db.incidentsData.ensureIndex({ "borough": 1});
    db.incidentsData.ensureIndex({ "firstPumpStation": 1});
    db.incidentsData.ensureIndex({ "borough": 1, "firstPumpStation": 1});
    db.censusData.ensureIndex({ borough: 1});

Next copy config.env.example to config.env and update this to point to your database and set the port you want to run the server on.

Then, we can start the server by doing:

    node api_server.js

You will see that the server starts caching a series of calculations that are the most common, to speedup execution. The server will be available for use at completion of this process.

    2013/11/01 19:20:44 - The server is listening on port 8080.
    2013/11/01 19:20:44 - Caching getBoroughResponseTime(borough)...
    2013/11/01 19:20:44 - Calculating for the first time getBoroughResponseTime for Barking and Dagenham with closed stations: 
    2013/11/01 19:20:44 - Calculating for the first time getBoroughResponseTimes for Barking and Dagenham with closed stations: 
    (...)
    2013/11/01 19:22:11 - Caching completed.

You can then test that the server is up and running by calling any of the APIs from a web browser, for example _http://serverName:port/getAllBoroughsScores_ .
