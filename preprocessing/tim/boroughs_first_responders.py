# coding: utf-8
import csv
from gzip import GzipFile
from sets import Set
import numpy
incidents_file = GzipFile("../reference data/LFB/LFB data 1 Jan 2009 to 31 Mar 2013.csv.gz")
incidents_reader = csv.reader(incidents_file)
incidents = list(incidents_reader)
print zip(*incidents)[12][0:10]
print zip(*incidents)[22][0:10]
borough_first_responders = [(row[12], row[22]) for row in incidents[1:]]
borough_first_responders_map = {}
first_responders_boroughs_map = {}

for (borough, station) in borough_first_responders:
    if borough != " Not geo-coded" and station != "NULL":
      if not station in first_responders_boroughs_map:
        first_responders_boroughs_map[station] = Set()

      if not borough in borough_first_responders_map:
          borough_first_responders_map[borough] = Set()

      borough_first_responders_map[borough].add(station)
      first_responders_boroughs_map[station].add(borough);

print [(borough, len(borough_first_responders_map[borough])) for borough in borough_first_responders_map]
print len(first_responders_boroughs_map)
print [(station, len(first_responders_boroughs_map[station])) for station in first_responders_boroughs_map]
print len(borough_first_responders_map)
n_boroughs = numpy.array([len(first_responders_boroughs_map[station]) for station in first_responders_boroughs_map])
print numpy.mean(n_boroughs)
print numpy.std(n_boroughs)
