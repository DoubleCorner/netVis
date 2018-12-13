/**
 *AER(Additional Edge Resizing)
 * 针对增量式布局中，添加边后，我们重新
 * 调整节点的位置和边的长度
 * **/
function AER(layoutNodes,addEdges,width,height){

	var nodes = [];
	var id_index;
	var k = parseInt(Math.sqrt(width*height/layoutNodes.length)), a = 0.8 , b = 0.8;
	this.start = function(){
		this.nodePos();
	}

	this.nodePos = function(){
        id_index = idToIndex(layoutNodes);


		var edgesOrder = this.edgeLengthOrder(addEdges);
		//先计算最长的边，然后依次计算
        // console.log('添加的边：');
		// console.log(addEdges, edgesOrder);
		edgesOrder.forEach(function(d){
		 var x1 = layoutNodes[id_index[d.target] - 0].x - layoutNodes[id_index[d.source] - 0].x;
		 var y1 = layoutNodes[id_index[d.target] - 0].y - layoutNodes[id_index[d.source] - 0].y;
		 var edgeLength = Math.sqrt(x1*x1 + y1*y1);
		 var degreeScale = layoutNodes[id_index[d.target] - 0].degree/(layoutNodes[id_index[d.source] - 0].degree + layoutNodes[id_index[d.target] - 0].degree)
		 w = a*(1 - b*k/edgeLength)*degreeScale;
		 layoutNodes[id_index[d.source] - 0].x = w*x1 + layoutNodes[id_index[d.source] - 0].x;
		 layoutNodes[id_index[d.source] - 0].y = w*y1 + layoutNodes[id_index[d.source] - 0].y;

		 layoutNodes[id_index[d.target] - 0].x = -w*x1 + layoutNodes[id_index[d.target] - 0].x;
		 layoutNodes[id_index[d.target] - 0].y = -w*y1 + layoutNodes[id_index[d.target] - 0].y;
	  })
	}
    //将边按长度的大小顺序排序，大的在前，小的在后
    this.edgeLengthOrder = function(edges){
    	var edgeOrder = [];
    	var lengthArray = [];
    	var lengtDict = {};

    	edges.forEach(function(d){
    	  var x1 = layoutNodes[id_index[d.target] - 0].x - layoutNodes[id_index[d.source] - 0].x;
		  var y1 = layoutNodes[id_index[d.target] - 0].y - layoutNodes[id_index[d.source] - 0].y;
		  var edgeLength = Math.sqrt(x1*x1 + y1*y1);
		  lengtDict[edgeLength] = d;
		  lengthArray.push(edgeLength);
    	})
    	//根据edge的长度进行排序，降序排列
    	lengthArray.sort(function compare(a,b){ return b - a});
    	for (var i = 0; i < lengthArray.length; i++) {
    		edgeOrder[i] = lengtDict[lengthArray[i]];
    	}
        return edgeOrder;
    }

    function idToIndex(layoutNodes) {
        var  idIndex = {};
        layoutNodes.forEach(function (d) {
            idIndex[d.id] = d.subs;
        })
        return idIndex;
    }
}
