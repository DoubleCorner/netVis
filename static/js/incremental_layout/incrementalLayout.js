/**
 * Created by zhangye on 2018/6/5.
 */
function IncrementalLayout(){

    var a = d3.rgb(255,0,0);	//红色
    var b = d3.rgb(144,202,235);	//绿色
    var compute = d3.interpolate(a,b);
    var linear = d3.scale.linear()
        .domain([0,50])
        .range([0,1]);
    var start_number = 50;
    var add_numbber = 15;
    var timer;
    d3.csv("../static/js/incremental_layout/data/bus1.csv", function(error, data) {
        var start_data = [];
        var width = 1350 , heigth = 650;
        var nodeArray = [];
        var layoutNodes = [];
        var nodesIdArray = [];
        for (var  i = 0; i < start_number; i++){
            start_data[i] = data[i];
        }

        console.log(start_data);

        var la = new d3layout(start_data, width, heigth);
        la.draw();

        var button_count = 0;//计算点击次数
        $('#play_c').on('click',function () {
            var title = d3.select(this).attr('title');
            if(title == '点击播放'){
                clearInterval(timer);
                return;
            }
            if(button_count == 0){
                la.force.stop()
                layoutNodes  = countArray(start_data);
            }


            button_count = button_count % 100;//防止出现button_count一直加的导致数值超过上限的情况
            button_count++;

         timer =  setInterval(function(){
                var perLayoutNodes = [];
                layoutNodes.forEach(function(d){
                    var dict = {'id':d.id, 'age':d.age, 'degree':d.degree, 'links':[].concat(d.links), 'x':d.x, 'y':d.y, 'subs':d.subs }
                    perLayoutNodes.push(dict);
                })
                var addNodes = [];
                var addEdges = [];
                var addData = [];

                layoutNodes.forEach(function(d) {
                    nodesIdArray.push(d.id);
                })

                for (var  i = 0; i < add_numbber; i++){
                    addData.push(data[start_number + i])
                    var sourceId = data[start_number + i].source, targetId = data[start_number + i].target;
                    if(nodesIdArray.indexOf(sourceId) > -1&& nodesIdArray.indexOf(targetId) > -1){
                        addEdges.push(data[start_number + i])
                    }else {
                        addNodes.push(data[start_number + i]);
                    }

                }
                start_number += add_numbber;
                var aer = new AER(layoutNodes, addEdges, width, heigth);
                var ssbm = new SSBM(layoutNodes, addNodes, width, heigth);
                var age = new AGE(perLayoutNodes, layoutNodes, addData);
                var repulsion = new RepulsionAll(layoutNodes, width, heigth)

                aer.start();//添加边时，位置变化
                ssbm.start();//初始化新增节点位置
                age.start();//设置年龄
                repulsion.start();//计算排斥力等，移动位置
                drawing(layoutNodes,width,heigth);
                console.log(layoutNodes);

           },1000);



        })

    })

    function transforIntoNodeArray(data) {
        var nodeArray = [];
        var nodedict = {};
        data.forEach(function(d) {
            if(nodedict[d.source]) {
                nodedict[d.source].push(d.target);
            } else {
                nodedict[d.source] = [d.target];
            }

            if(nodedict[d.target]) {
                nodedict[d.target].push(d.source)
            } else {
                nodedict[d.target] = [d.source];
            }
        })

        for(var head in nodedict) {
            var dict = {
                'id': head,
                'links': nodedict[head]
            };
            nodeArray.push(dict);
        }
        return nodeArray;
    }

    function countArray(data) {
        var nodeDict = {}
        var  dict = {}
        var  layoutNodes = [];
        data.forEach(function (item) {

            if(nodeDict[item.source]){
                nodeDict[item.source].push(item.target)
            }else{
                nodeDict[item.source] = [];
                nodeDict[item.source].push(item.target)
            }

            if(nodeDict[item.target]){
                nodeDict[item.target].push(item.source)
            }else{
                nodeDict[item.target] = [];
                nodeDict[item.target].push(item.source)
            }

        });
            var count = 0;
            d3.selectAll(".node").each(function (d) {
                var id = d3.select(this).attr('id');
                var x = d3.select(this).attr('cx');
                var y = d3.select(this).attr('cy');
                var dict = {};
                dict['id'] = id;
                dict['links'] = nodeDict[id];
                dict['index'] = count;
                dict['subs'] = count;
                dict['age'] = 1;
                dict['degree'] = nodeDict[id].length;
                dict['x'] = Number(x);
                dict['y'] = Number(y);
                layoutNodes.push(dict)
                count++;
            })
        return layoutNodes;
    }
    function drawing(layoutNodes, width, height) {
        d3.select("#main").select("svg").remove();
         var id_index = idToIndex(layoutNodes);

        var svg = d3.select("#main")
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        for(var i = 0; i < layoutNodes.length; i++) {
            svg.append("g")
                .attr("class", "links")
                .selectAll("line")
                .data(layoutNodes[i].links).enter()
                .append("line")
                .attr("class", "link")
                .attr("stroke-width", 0.5)
                .attr("x1", layoutNodes[i].x)
                .attr("y1", layoutNodes[i].y)
                .attr("x2", function(d) {
                    return layoutNodes[id_index[d] - 0].x;
                })
                .attr("y2", function(d) {
                    return layoutNodes[id_index[d] - 0].y;
                })
                .attr("stroke", "gray")
        }

        svg.append("g")
            .attr("class", "nodes")
            .selectAll("circle")
            .data(layoutNodes).enter()
            .append("circle")
            .attr("class", "node")
            .attr("r", 5)
            .attr("cx", function(d) {
                return d.x;
            })
            .attr("cy", function(d) {
                return d.y;
            })
            .attr("id", function(d) {
                return d.id;
            })
            .attr("fill", function(d){
                return compute(linear(d.age))
            })
            .attr("stroke", "gray")
    }

     function idToIndex (layoutNodes) {
        var  idIndex = {};
        layoutNodes.forEach(function (d) {
            idIndex[d.id] = d.subs;
        })
        return idIndex;
    }
}