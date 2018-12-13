/**
 * SSBM((Sorted Sequential Barycenter Merging)
 * 在增量式布局中，确定添加节点
 * 的先后顺序，并用改进的质心算法
 * 确定添加节点的位置。
 * **/
function SSBM(layoutNodes, addNodes, width, height) {
    var k = parseInt(Math.sqrt(width*height/layoutNodes.length)*3);

	var nodesArrayCopy1 = [];
	var id_index ;

	this.start = function() {
     var nodeOrder;
     nodeOrder = this.nodesOrder();
     this.nodesPos(nodeOrder, nodesArrayCopy1)
	}

	this.nodesOrder = function() {
        id_index = idToIndex(layoutNodes);

		var nodesArray = [];
		var nodesDict;
		var nodeCount;
		var nodeOrder = [];
		var addNodesArray = [];
		var addNodesCopy = [].concat(addNodes);
		var nodesDictCopy;

		layoutNodes.forEach(function(d) {
			nodesArray.push(d.id);
		})
		nodesArrayCopy1 = [].concat(nodesArray);

		addNodes.forEach(function(d){
			if(nodesArray.indexOf(d.source) == -1){
				addNodesArray.push(d.source);
			}
			if(nodesArray.indexOf(d.target) == -1){
				addNodesArray.push(d.target);
			}
		})
		//新增的节点
        addNodesArray = this.unique(addNodesArray);
	//	console.log('新增节点：', addNodesArray)

		while(1) {

			nodeCount = [];
			nodesDict = {};
			nodesDictCopy = {};
			addNodesCopy.forEach(function(d) {

				if(nodesArray.indexOf(d.source) == -1 && nodesArray.indexOf(d.target) == -1) {
					if(!nodesDict[d.source]) {
						nodesDict[d.source] = 0;
					}
					if(!nodesDict[d.target]) {
						nodesDict[d.target] = 0;
					}
				}
				if(nodesArray.indexOf(d.source) > -1&&nodesArray.indexOf(d.target) == -1) {
					if(nodesDict[d.target]) {
						nodesDict[d.target]++;
						nodesDictCopy[d.target].push(d.source);
					} else {
						nodesDict[d.target] = 1;
						nodesDictCopy[d.target] = [];
						nodesDictCopy[d.target].push(d.source);
					}
				}

				if(nodesArray.indexOf(d.target) > -1&&nodesArray.indexOf(d.source) == -1) {
					if(nodesDict[d.source]) {
						nodesDict[d.source]++;
						nodesDictCopy[d.source].push(d.target);
					} else {
						nodesDict[d.source] = 1;
						nodesDictCopy[d.source] = [];
						nodesDictCopy[d.source].push(d.target);
					}
				}
			})
			for(var head in nodesDict) {
				nodeCount.push(nodesDict[head]);
			}
			//根据新增节点与已存在的节点的连接的度的大小顺序（降序）
			nodeCount.sort(function compare(a, b) {
				return b - a
			});
			//选择count最大的节点
			for(var head in nodesDict) {
               	 if(nodesDict[head] == nodeCount[0]) {
					nodeOrder.push({"id":head, "count":nodeCount[0], "nodes":nodesDictCopy[head]})
					nodesArray.push(head);
					break;
				 }
			}

            var addNodesCopy_i = 0;
            var delete_i = [];
            addNodesCopy.forEach(function(d){
            	if(nodesArray.indexOf(d.source) > -1&&nodesArray.indexOf(d.target) > -1) {
            		delete_i.push(addNodesCopy_i);
				}
            	addNodesCopy_i++;
            })
            var number = 0
            for (var i = 0; i < delete_i.length; i++) {
            	number = delete_i[i] - i;
            	addNodesCopy.splice(number,1);
            }

			if(nodeOrder.length == addNodesArray.length) {
				break;
			}
		}
              return nodeOrder;
	}

    this.nodesPos = function(nodeOrder, nodesArrayCopy){
      //  console.log('新增节点顺序',nodeOrder)
    	     /**
        	 * degree:节点的度
        	 * index:节点的类别
        	 * **/
        nodeOrder.forEach(function(d){
        	var subs =  layoutNodes.length - 1;
        	layoutNodes[subs + 1] = {'degree': 0, 'id': d.id, 'links': [], 'x': 0, 'y': 0,'age': 1, 'subs': subs + 1};
            id_index = idToIndex(layoutNodes);

        	var x1 = Math.random(), y1 = Math.random();
        	//计算node的x，y
        	if(d.count >= 2){
        		var center_x = 0, center_y = 0;
        		for(var i = 0; i < d.nodes.length; i++){
        			center_x += layoutNodes[id_index[d.nodes[i]] - 0].x;
        			center_y += layoutNodes[id_index[d.nodes[i]] - 0].y;
        		}
        		center_x = (1/d.count)*center_x;
        		center_y = (1/d.count)*center_y;

        		layoutNodes[id_index[d.id] - 0].x = center_x + 0.05*k*x1;
        		layoutNodes[id_index[d.id] - 0].y = center_y + 0.05*k*y1;

        	}else if(d.count == 1){
        		var center_x = 0, center_y = 0;
        		center_x += layoutNodes[id_index[d.nodes[0]] - 0].x;
        		center_y += layoutNodes[id_index[d.nodes[0]] - 0].y;
        		layoutNodes[id_index[d.id] - 0].x = center_x + 0.5*k*x1;
        		layoutNodes[id_index[d.id] - 0].y = center_y + 0.5*k*y1;

        	}else{
        		var random_x = 4*width/5 - 100*x1;
        		var random_x1 = width/5 + 100*x1;
        		var node_x = 0;
        		if(Math.random() >= 0.5){
                    node_x = random_x
				}else{
                    node_x = random_x1;
				}
        		layoutNodes[id_index[d.id] - 0].x = node_x;
        		layoutNodes[id_index[d.id] - 0].y = height*y1;
        	}
        	//相应的改变layoutNodes
        	addNodes.forEach(function(n){
        		if(d.id == n.source){
        			if(nodesArrayCopy.indexOf(n.source) > -1){
        				layoutNodes[id_index[n.source] - 0].links.push(d.id);
        				layoutNodes[id_index[n.source] - 0].degree++;
        			}
        			layoutNodes[id_index[d.id] - 0].index = d.id - 1;
        			layoutNodes[id_index[d.id] - 0].degree++;
        			layoutNodes[id_index[d.id] - 0].links.push(n.target);
        		}
        		if(d.id == n.target){
        			if(nodesArrayCopy.indexOf(n.target) > -1){
        				layoutNodes[id_index[n.target] - 0].links.push(d.id);
        				layoutNodes[id_index[n.target] - 0].degree++;
        			}
        			layoutNodes[id_index[d.id] - 0].index = d.id;
        			layoutNodes[id_index[d.id] - 0].degree++;
        			layoutNodes[id_index[d.id] - 0].links.push(n.source);
        		}
        	})
        })

    }

	this.unique = function(arr) {
        return  Array.from(new Set(arr));
	}
     function idToIndex(layoutNodes) {
        var  idIndex = {};
        layoutNodes.forEach(function (d) {
            idIndex[d.id] = d.subs;
        })
        return idIndex;
    }
}
