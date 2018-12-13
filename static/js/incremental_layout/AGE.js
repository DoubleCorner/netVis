/***
 * age算法设置节点是否移动，
 * 以及移动的难易程度
 * preLayoutNodes:变化之前的数据
 * ***/
function AGE(preLayoutNodes, layoutNodes, addNode) {
	var nodesArray = [];
	var id_index;
	var perId_index;
	this.start = function() {
		this.age();
	}

	this.age = function() {

        id_index = idToIndex(layoutNodes);
        perId_index = idToIndex(preLayoutNodes);
		preLayoutNodes.forEach(function(d) {
			nodesArray.push(d.id);
		})

        for(var i = 0; i < layoutNodes.length; i++){
            var id = layoutNodes[i].id;
           // console.log(id, i);
            //新增节点的age为1，不用计算
            if(addNode.includes(id)){
            	continue;
			}
            var perLinks = [], links = [];
            perLinks = preLayoutNodes[perId_index[id] - 0].links;
            links = layoutNodes[id_index[id] - 0].links;
            //console.log('节点链接情况：');
            //console.log(perLinks, links);
            //没有变化的节点age只需加1
            if(equalArray(perLinks, links)){
                layoutNodes[i].age++;
                continue;
			}
            var add_age = 0,
                rem_age = 0,
                tol_age = 0,
				del_age = 0;

             //计算节点的age（rem_age，add_age）;
            for(var j = 0; j < links.length; j++) {
                if(perLinks.indexOf(links[j]) > -1) {
                    rem_age += preLayoutNodes[perId_index[links[j]] - 0].age;
                } else {
                    if(nodesArray.indexOf(links[j]) > -1){
                        add_age += preLayoutNodes[perId_index[links[j]] - 0].age;
                    }else{
                    	//这时此节点为新增节点
                        add_age++;
                    }
                }
            }
            //计算节点的age（del_age）;
            for(var k = 0; k < perLinks.length; k++) {
                if(links.indexOf(perLinks[k]) == -1) {
                    del_age += preLayoutNodes[perId_index[perLinks[k]] - 0].age;
                }
            }
            tol_age = rem_age + add_age + del_age;
            // console.log('节点age：')
            // console.log(tol_age, rem_age, add_age, del_age)
            // console.log('节点id：')
            // console.log(id_index[id] - 0, perId_index[id] - 0)
            layoutNodes[id_index[id] - 0].age = parseInt(preLayoutNodes[perId_index[id] - 0].age * (rem_age / tol_age) + 1);
		}
	}
	this.unique = function(arr) {
		return  Array.from(new Set(arr));
	}
	//将对于id转为对应数组下标
    function idToIndex(layoutNodes) {
        var  idIndex = {};
        layoutNodes.forEach(function (d) {
            idIndex[d.id] = d.subs;
        })
        return idIndex;
    }
    //判断两数字数组是否相等
    function equalArray(arr1, arr2) {
         if(arr1.sort().toString() === arr2.sort().toString()){
             return true;
		 }
		 return false;
    }
}
