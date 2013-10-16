# coding: utf-8
import csv
from sets import Set

incidents_file = open("web/map prototype/data/incidents.csv")
incidents_reader = csv.reader(incidents_file)
incidents = list(incidents_reader)

borough_wards = zip(*(zip(*incidents)[3:5]))[1:]

wards_boroughs_map = {}
borough_wards_map = {}


for (borough, ward) in borough_wards:
    if not borough in borough_wards_map:
        borough_wards_map[borough] = Set()
    if not ward in wards_boroughs_map:
        wards_boroughs_map[ward] = Set()
    borough_wards_map[borough].add(ward)
    wards_boroughs_map[ward].add(borough)

print [(ward, len(wards_boroughs_map[ward])) for ward in wards_boroughs_map]
print [(borough, len(borough_wards_map[borough])) for borough in borough_wards_map]
print len(wards_boroughs_map)
