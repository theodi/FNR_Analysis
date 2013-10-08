# Quick API

The incidents map now has an API which cheches query responses in files. 

## Affect of closures on a borough

To get data on boroughs with a stations closed:

* get_data.php?borough=newham&close=Silvertown,Woolwich

Although we can have a lot of possible permutations, the caching does help speed things up  

## Boroughs affected by station closures

* boroughs_reload.php?stations=Silvertown,Woolwich
