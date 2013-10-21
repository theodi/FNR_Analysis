# coding: utf-8
import csv
from gzip import GzipFile
from sets import Set
import re
import numpy as np
import scipy.stats as ss
import matplotlib.pyplot as plt

incidents_file = GzipFile("reference data/LFB/LFB data 1 Jan 2009 to 31 Mar 2013.csv.gz")
incidents_reader = csv.reader(incidents_file)
incidents = list(incidents_reader)
number = re.compile("^\d+$")
times = [int(s) for s in zip(*incidents)[21] if number.search(s)]

mu = np.mean(times)
sigma = np.std(times)
print mu
print sigma
print ss.scoreatpercentile(times, per=50)
print ss.scoreatpercentile(times, per=95)
print ss.scoreatpercentile(times, per=5)
x = np.linspace(0,1400,1000)
fig = plt.figure(figsize=(8,8))
ax  = fig.add_subplot(111)
ax.hist(times, bins=100, normed=1)
print ss.norm.cdf([180, 540], mu, sigma)
ax.plot(x, ss.norm.pdf(x, mu, sigma),color='red', linewidth=2.0)
fig.savefig("response-times-hist.svg")
