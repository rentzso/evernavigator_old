// Library with filtering functions 
var filters = {
// generic filter function
filterGraph : function(jsonGraph, filterOnNode){
  var graph = {
    nodes: jsonGraph.nodes.filter( function(n){n.show = filterOnNode(n); return n.show} ),
    foci:  jsonGraph.foci,
    links: []
  };
  
  graph.links = jsonGraph.links.filter(function(link){ link.show = (link.source.show && link.target.show); return link.show; } );
  return graph;
},

// example: filter on count
filterCount: function(jsonGraph, count) {
  var f = function(node){
    return (node.count>=count) ;
  };
  return filters.filterGraph(jsonGraph, f);
},

// filter the whole graph in a sorted list of ids
filterIds: function(jsonGraph, sortedListIds){
  var j = 0;
  var graph = {
    nodes: jsonGraph.nodes.filter( function(n, i){n.show = (i===sortedListIds[j]); if (n.show) j++;  return n.show} ),
    foci:  jsonGraph.foci,
    links: []
  };
  
  graph.links = jsonGraph.links.filter(function(link){ link.show = (link.source.show && link.target.show); return link.show; } );
  return graph;
},

test: function(){
  d3.json('foci.json', function(json){
    var color = d3.scale.category20();
    var force = d3.layout.force();
    
    force.nodes(json.nodes).links(json.links).start();
    
    json.foci = json.foci.map(function(d, i){
	    json.nodes[d]["properties"] = {"color": color(i), "focus": json.nodes[d].tag};
	    //console.log(color(i));
	    return json.nodes[d]; 
	  });
    
    console.log(filters.filterCount(json, 10));
  });

}
}
