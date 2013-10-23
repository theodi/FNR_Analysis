import csv
from sqlalchemy import create_engine, BigInteger, Index, Date, Table, Column, Integer, String, Float, MetaData

if __name__ == "__main__":
  engine = create_engine("mysql://odi:odi@localhost/odi")
  metadata = MetaData()
  incidents = Table('incidents', metadata,
    Column('id', Integer, primary_key=True),
    Column("day", String(256)),
    Column("time", Integer),
    Column("simplifiedLongitude", Float),
    Column("simplifiedLatitude", Float),
    Column("date", Date),
    Column("incidentGroup", String(256)),
    Column("borough", String(256)),
    Column("ward", String(256)),
    Column("firstPumpTime", Integer),
    Column("firstPumpStation", String(256)),
    Column("telefonicaGridId", BigInteger),
    Column("footfall", Integer),
  )
  index = Index("index_borough_station", incidents.c.borough, incidents.c.firstPumpStation)
  metadata.create_all(engine)
  conn = engine.connect()
  csv_file = open("web/map prototype/data/incidents.csv")
  data = csv.reader(csv_file)
  next(data, None); #skip the header
  for row in data:
    ins = incidents.insert().values(
      day=row[1],
      time = row[2],
      simplifiedLongitude = row[3],
      simplifiedLatitude = row[4],
      date = row[5],
      incidentGroup = row[6],
      borough = row[7],
      ward = row[8],
      firstPumpTime = row[9],
      firstPumpStation = row[10],
      telefonicaGridId = row[11],
      footfall = row[12],
    )
    conn.execute(ins)
