initializeScatter = function() {
	
	function x(d) { return d.score; }
	function y(d) { return d.responseTime; }
	function radius(d) { return getRadius(d.areaSqKm); }
	function color(d) { return "#0000FF"; }
	function key(d) { return d.borough; }

	function getRadius(num) {
		var tmp = num / Math.PI;
		return Math.sqrt(tmp);
	}

	var margin = {top: 19.5, right: 19.5, bottom: 19.5, left: 39.5},
	    width = 960 - margin.right,
	    height = 500 - margin.top - margin.bottom;

	// Various scales. These domains make assumptions of data, naturally.
	var xScale = d3.scale.linear().domain([3, 5]).range([0, width]),
		yScale = d3.scale.linear().domain([250, 450]).range([height, 0]),
		colorScale = d3.scale.category10();

	// The x & y axes.
	//var xAxis = d3.svg.axis().orient("bottom").scale(xScale).ticks(12, d3.format(",d")),
    	var xAxis = d3.svg.axis().scale(xScale).orient("bottom");
	var yAxis = d3.svg.axis().scale(yScale).orient("left");

	// Create the SVG container and set the origin.
	var svg = d3.select("#chart").append("svg")
		.attr("width", width + margin.left + margin.right)	
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// Add the x-axis.
	svg.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + height + ")")
		.call(xAxis);

	// Add the y-axis.
	svg.append("g")
		.attr("class", "y axis")
		.call(yAxis);

	// Add an x-axis label.
	svg.append("text")
		.attr("class", "x label")
		.attr("text-anchor", "end")
		.attr("x", width)
		.attr("y", height - 6)
		.text("Response Time / Footfall Score");

	// Add a y-axis label.
	svg.append("text")
		.attr("class", "y label")
		.attr("text-anchor", "end")
		.attr("y", 6)
		.attr("dy", ".75em")
		.attr("transform", "rotate(-90)")
		.text("Response Time (s)");

	d3.json("http://api.london-fire.labs.theodi.org:8080/getAllBoroughScores", function(data) {
		// Add a dot per nation. Initialize the data at 1800, and set the colors.
		var dot = svg.append("g")
			.attr("class", "dots")
			.selectAll(".dot")
			.data(data.response)
			.enter().append("circle")
      			.attr("class", "dot")
      			.style("fill", function(d) { return "#0000FF"; })
			.call(position)
      			.sort(order);
  // Add a title.
  dot.append("title")
      .text(function(d) { return d.borough; });
});
  // Positions the dots based on data.
  function position(dot) {
    dot .attr("cx", function(d) { return xScale(x(d)); })
        .attr("cy", function(d) { return yScale(y(d)); })
        .attr("r", function(d) { return radius(d); });
  }

  // Defines a sort order so that the smallest dots are drawn on top.
  function order(a, b) {
    return radius(b) - radius(a);
  }

}
