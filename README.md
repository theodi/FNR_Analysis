#Setup instructions

##Preprocessing
Before the server can be run, all pre-processing activities must be completed according to the data workdflow diagram at [this url](preprocessing/preprocessing%20data%20workflow%20diagram.pdf?raw=true) (PDF).

All the source data but for the Telefónica Dynamic Insights files are in this repository at [data/sources](tree/master/data/sources). [data/preprocessed](tree/master/data/preprocessed) instead has copies of the output of the preprocessing stage.

Data must be processed in the same order suggested by the arrows in the diagrams. The arrows are labelled with the name of the function to be run, e.g. _incidents.preprocess. readAndClean_ corresponds to the function of the same name in the _incidents.preprocess.R_ file in the _preprocessing_ folder. 

All R scripts have been tested vs version 3.0.2 of the interpreter on MacOS 10.8.5. The comments in the source code for each of the functions explain how to use them. The function signatures often include working default values, e.g. the relative position of the input files they have to be applied to.

All Node.js scripts have been tested vs version 0.10.21 of the interpreter on MacOS 10.8.5. Before execution, all dependencies must be installed by running _npm install_ in the _preprocessing_ folder. By running the scripts without parameters, e.g. _node stations.preprocess.js_, any required instructions are provided on screen.

The output of the preprocessing stage is the list of files below:
- For the web client
  - A set of _[borough name].json_ "GeoJSON" files, each of which defines the boroughs' boundaries on the map and stores their default scoring, that is when all stations are open
  - _stations.csv_, with all stations' addresses and coordinates, for displaying on the map 
  - _boroughs\_by\_first\_responders.json_, with the list of stations that supported each of the boroughs' incidents, grouped by borough 
- For the server
  - An _incidents.csv_ file with all pre-processed incident records, to be loaded onto the MongoDB instance used by the server

[TO BE COMPLETED with the description of how _boroughs\_by\_first\_responders.json_ is generated]

##Server
[TO BE COMPLETED]