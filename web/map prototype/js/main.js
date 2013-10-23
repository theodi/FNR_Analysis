var log = function (s) {
	var entryDate = new Date();
	console.log(entryDate.getFullYear() + "/" + (entryDate.getMonth() < 9 ? '0' : '') + (entryDate.getMonth() + 1) + "/" + (entryDate.getDate() < 10 ? '0' : '') + entryDate.getDate() + " " + (entryDate.getHours() < 10 ? '0' : '') + entryDate.getHours() + ":" + (entryDate.getMinutes() < 10 ? '0' : '') + entryDate.getMinutes() + ":" + (entryDate.getSeconds() < 10 ? '0' : '') + entryDate.getSeconds() + " - " + s);
}

// general utility removing 'item' from 'array', this is used mainly in
// mapping.js
var removeArrayItem = function (item, array) {
	return _.filter(array, function (x) { return item !== x});
}


$(document).ready(function() {
	loadData(function (err) {
   		Map.initialize('map');
		log("Ready");
	});
});
