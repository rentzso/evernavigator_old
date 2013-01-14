var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/evernavigator');


// the Schema used to store each tag

var nodeSchema = new mongoose.Schema({
	    userId: Number,
		tag: String, 
		guid: String, //unique identifier for the tag
		count: Number, // number of notes for which the tag has been used.
		notes: [{guid: String, title: String}], // list of guids and titles of the notes tagged with this tag
		related: [{tag: String, guid: String, count: Number}] // list of related tags
	});

nodeSchema.index({userId: 1});
nodeSchema.index({guid: 1});

// find all the tags used by a given User
nodeSchema.statics.findByUserId = function(userId, cb){
	console.log("mongo looking for userId: ", userId);
	this.find({userId: userId}, cb);
}

// build the graph of all the tags used by a given User
nodeSchema.statics.buildUserGraph = function(userId, cb){
	var model = this;
	model.findByUserId(userId,
		function(err, nodes){
			console.log(nodes.length, "tags found for user", userId);
			cb(err, fromNodesToGraph(nodes));
		});
}

// link the mongo collection to the Schema
var NodeModel = mongoose.model('Tags',nodeSchema);


// fromNodesToGraph build the json
// that will be used to build the d3js graph.
// each node-tag in the list should contain a
// reference to its related nodes.

var fromNodesToGraph = function(node_list){
	var nodes = [];
	var guidToId = {};
	var guidToRelated = {}; 

	node_list.forEach(function(d, i){
		new_node = {};
		new_node.tag = d.tag;
		new_node.guid = d.guid;
		new_node.count = d.count;
		new_node.notes = d.notes;
		new_node.related = [];
		guidToId[d.guid] = i;
		guidToRelated[d.guid] = d.related;
		nodes.push(new_node);
	});

	var links = [];

	nodes.forEach(function(d,i){
		var relatedNodes = guidToRelated[d.guid];
		if (typeof relatedNodes !== 'undefined'){
			relatedNodes.forEach(
				function(relatedNode){
					var j = guidToId[relatedNode.guid]; 
					if ( j > i ){
						new_link = {};
						new_link['source'] = i;
						new_link['target'] = j;
						new_link['value']  = relatedNode.count;
						links.push(new_link);
					}

					if (typeof j!== 'undefined'){
						d.related.push(j);
					}

				}
			);
		};
	});
	return {'links':links, 'nodes':nodes};
}

exports.NodeModel = NodeModel;