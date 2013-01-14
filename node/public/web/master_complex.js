var initialize = function(json, limits, force, color){
    
	var n = json.nodes.length;
    var min_foci, min_i;
    json.foci = [];
    var num_foci = Math.max(5, Math.round( Math.log(n+1)*1.6) );
    var count = 0;
    var a;
    json.nodes.forEach(function(d, i) {
    	var r = Math.min(limits.xmax - limits.xmin, limits.ymax - limits.ymin)/2;
        d.x = Math.floor( r * Math.cos(2*Math.PI*i/n) + (limits.xmax - limits.xmin)/2);
        d.y = Math.floor( r * Math.sin(2*Math.PI*i/n) + (limits.ymax - limits.ymin)/2);
        d.related.sort(function(a,b){return a-b});
        if (d.tag==="python"){
            //console.log(d.related.sort(function(j,k){return j > k}));
            console.log(d.related);
        }


        // to be optimized
        // find the top "num_foci" nodes by count
        
        if (json.foci.length < num_foci){
            json.foci.push(d);
        } else {
            min_foci = null;
            json.foci.forEach(
                function(focus, i){
                    //console.log(focus);
                    if (min_foci=== null || focus.count < min_foci){
                        min_foci = focus.count;
                        min_i = i;
                    }
                });

            if (d.count > min_foci){
                json.foci[min_i] = d;
            }
        }
        d.focus = false;
    });
    console.log('count', count);
    //console.log(json.foci);

    json.foci = json.foci.map(function(d, i){
        d.focus = true;
        d["properties"] = {"color": color(i), "focus": d.tag};
        //console.log(color(i));
        return d; 
    });


    force.nodes(json.nodes)
        .links(json.links)
        .start();
    
    json.links = json.links.map(
          function(d){
            if (d.source.focus && d.target.focus){
                //console.log('cioa', d);
                d["focus"] = (d.source.count>d.target.count)?d.source:d.target;
            } else if (d.source.focus){
                d["focus"] = d.source;
                d.target.properties = d.source.properties;
            } else if (d.target.focus){
                d["focus"] = d.target;
                d.source.properties = d.target.properties;
            }
            //console.log(d);
            return d;
          }
        );



    return json;

}


var graphEngine = function(jsonfile, width, height, padding, force, svg, color){
	var vis  = svg.append("g");
	var text = svg.append("text").style("font-size", "30px").attr("x",10).attr("y", 30);
	var limits = {
		xmin: padding,
		ymin: padding,
		xmax: width  - padding,
		ymax: height - padding
	};

    var local_limits = null;


    d3.json(jsonfile, function(jsonOut){

        var json = initialize(jsonOut, {xmin: 0, xmax: width, ymin: 0, ymax: height}, force, color);

        var link = 
            vis.selectAll("line.link")
               .data(json.links)
               .enter().append("line")
               .attr("class", 
                    function(link){
                        return link.show?"link show":"link hide"
                    });
           


        link.style("stroke", 
                function(link){ 
                    return typeof link.focus==="undefined"?
                        "black"
                        :link.focus.properties.color 
                })
            .style("stroke-opacity", 
                function(link){
                    return typeof link.focus==="undefined"?0.2:1 
                })
            .style("stroke-width", 
                function(link) {  
                    return (typeof link.focus === "undefined")?
                        1
                        :(link.source.focus && link.target.focus)?2.5:1; 
                });

              
        var nodes_to_draw = 
            json.nodes
                .filter(function(d){return !d.focus})
                .concat( json.nodes.filter(function(d){return d.focus}) );

        
        var node = vis.selectAll("circle.node")
            .data(nodes_to_draw)
            .enter().append("g")
            .attr("class", function(d){return d.show?"node show":"node hide";} )
            .attr("x", function(d) {return d.x;} )
            .attr("y", function(d) {return d.y;} )
            .on("click", function(d,i){ 
                window.location.hash = i; 
                d3.event.stopPropagation();
                d3.event.preventDefault();
            })
            .call(force.drag);

        svg.on("click", function(){ window.location.hash = "#main"; } );

        window.onhashchange = function(){
            if ( (window.location.hash === "#main") || (!window.location.hash)){
                force.stop();
                $(".hide").fadeIn(1000);
                text.text("");
                vis.transition().duration(1000).attr("transform", "");
                local_limits = null;

                force.nodes(json.nodes)
                     .links(json.links)
                     .size([width,height])
                     .resume();

            } else {
                var i = Number( window.location.hash.replace('#','') );
                var d = nodes_to_draw[i];
                force.stop();
                text.text("");
                //console.log(d.related);
                var subgraph = filters.filterIds(json, d.related);
                //console.log(subgraph);
          //d.show = true;
            
                node.attr("class", 
                    function(d){return d.show?"node show":"node hide";} );

                link.attr("class", 
                    function(link){ 
                        return link.show?"link show":"link hide"
                    });

                zoom();

                $(".hide").fadeOut(1000);
                $(".show").fadeIn();

                text.style("fill", d.properties?d.properties.color:"grey" )
                    .style("stroke", 
                        d.properties?d3.rgb( d.properties.color ).darker(2):"black" )
                    .style("stroke-opacity", 1)
                    .style("stroke-width", 1)
                    .text(d.tag);


                force.nodes(subgraph.nodes)
                     .links(subgraph.links)
                     .size([local_limits.xmin + local_limits.xmax, local_limits.ymin + local_limits.ymax])
                     .resume();
           }
        };

        function zoom(){
            var xlimits  = d3.extent($(".node.show"), function(el){ return +el.getAttribute("x") });
            var ylimits  = d3.extent($(".node.show"), function(el){ return +el.getAttribute("y") });
            local_limits = {
                xmin: xlimits[0],
                xmax: xlimits[1],
                ymin: ylimits[0],
                ymax: ylimits[1]
            };
            var ax =  (width - 2*padding)/(local_limits.xmax - local_limits.xmin);
            var ay =  (height- 2*padding)/(local_limits.ymax - local_limits.ymin);
            a = Math.min(ax,ay,3.5);
            var bx =  (width  - a*(local_limits.xmax + local_limits.xmin) )/2;
            var by =  (height - a*(local_limits.ymax + local_limits.ymin) )/2;
            vis.transition().duration(1000)
               .attr("transform", 
                "matrix("+ a + " 0 0 " + a + " " + bx +" " + by +")");

            local_limits = {
                xmin: (padding - bx)/a ,
                xmax: (width - padding - bx)/a ,
                ymin: (padding - by)/a ,
                ymax: (height - padding - by)/a 
            }

        };



        // non foci styling
        node//.filter(function(d){return !d.focus})
            .append("circle")
            .style("fill", 
            	function(d){
                    if (!d.focus){ 
            		  return d.properties?d.properties.color:"grey"
                    } else{ return "none"} 
            	})
            .style("stroke", 
            	function(d) { 
                    if (!d.focus){
                		return d.properties?
                		    d3.rgb( d.properties.color ).darker(2)
                		    :"black"
                    } else{ return "none" }
            	})
            .style("stroke-width", 1.5)
            .attr("r", 
                function(d){
                    if (d.focus){
                        return 0.001;
                    } else {
                        return d.count;
                    }
                });

        // foci styling
        node//.filter(function(d){return d.focus})
            .append("text")
            .attr("x", function(d){return d.x})
            .attr("y", function(d){return d.y})
            .attr("text-anchor", "middle")
            .attr("dy", ".3em")
            .style("font-size", "25px")
            .style("fill"  , function(d) { if (d.focus) return d.properties.color; })
            .style("stroke", function(d) { if (d.focus) return d3.rgb( d.properties.color ).darker(2); })
            .style("stroke-opacity", 1)
            .style("stroke-width", 1)
            .text(function(d) { if (d.focus){ return d.tag} });

        node.append("title").text(function(d) { return d.tag; });


        force.on("tick", function(e) {
            function x_limit(d){
                return d.x = Math.max( limits.xmin, Math.min(limits.xmax,d.x) )
            }

            function y_limit(d){
                
                 return d.y = Math.max( limits.ymin, Math.min(limits.ymax, d.y) )
            }

            node.attr("x", x_limit)
                .attr("y", y_limit);
                
            node.select("circle")
                .attr("cx", x_limit)
                .attr("cy", y_limit);

            node.select("text")
                .attr("x", x_limit)
                .attr("y", y_limit);

            if (local_limits){
                function x_loc_limit(d){
                    if (d.show){
                        return d.x = Math.max( local_limits.xmin, Math.min(local_limits.xmax,d.x) );
                    } else {
                        return d.x;
                    }
                }

                function y_loc_limit(d){
                    if (d.show){
                        return d.y = Math.max( local_limits.ymin, Math.min(local_limits.ymax,d.y) );
                    } else {
                        return d.y;
                    }
                }
                node.attr("x", x_loc_limit)
                    .attr("y", y_loc_limit);
                    
                node.select("circle")
                    .attr("cx", x_loc_limit)
                    .attr("cy", y_loc_limit);

                node.select("text")
                    .attr("x", x_loc_limit)
                    .attr("y", y_loc_limit);


            }

            link.attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });
                
        });

    });
}

var _temp;
var w_width = $(window).width();
var w_height = $(window).height();
var w_margin = 50;

var width   = w_width - w_margin*2,
    height  = w_height- w_margin*2,
    padding = 10,
    color   = d3.scale.category20();

var force = function() {
	return d3.layout
	         .force()
	         .charge( function(d){ return d.focus?-200:-50 } )
	         .gravity(0.15)
	         .linkDistance( function(d){
	         	return d.source.focus&&d.target.focus?100:50
	         })
	         .size([width, height]);

};

var svg = function(){ 
	return d3.select("#chart")
	         .append("svg")
             .attr("width" , width)
             .attr("height", height);
};


graphEngine('graph/' + userId, width, height, padding, force(), svg(), color);
$("div.graph").css("width", $("div.graph svg").css("width"));
$("div.graph").css("height", $("div.graph svg").css("height"));