// general utility removing 'item' from 'array', this is used mainly in
// mapping.js
var removeArrayItem = function (item, array) {
	return _.filter(array, function (x) { return item !== x});
}

$.blockUI();
$(document).ready(function() {
  Map.initialize('map');
});
