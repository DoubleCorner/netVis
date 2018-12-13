/**
 * Created by zhangye on 2018/6/5.
 */
var links_stroke_width = 1;
var links_color = "#808080";
var links_opacity = 0.75;

var nodes_color = '#FF0000';
var nodes_size = 4;
var nodes_stroke = "#ffaf0";
var nodes_opacity = 0.9;


var label_size = 8;
var label_stroke = "#fffafa";
var label_opacty = 1;
var label_vis = 'hidden';
var data;
var nodeSum;
var node_selected = null;
var edge_selected = null;
var edge_flag = false;
var edge_color;

function IncrementalLayout() {
    var width = $("#main").width();
    var height = $("#main").height();
    var startData = null;
    var preData = null;
    var nowData = null;
    var layoutNodes = [];
    var nodesIdArray = [];
    var layout;
    var run = true;

    var a = d3.rgb(255, 0, 0);	//红色
    var b = d3.rgb(144, 202, 235);	//绿色
    var compute = d3.interpolate(a, b);
    var linear = d3.scale.linear()
        .domain([1, 10])
        .range([0, 1]);

    var ajax = function () {
        $.ajax({
            type: "get",
            dataType: "json",
            url: "/brush_extent",
            async: false,
            data: {
                "layout_type": now_layout_type,
                "start": FormatDateTime(new Date('2015-4-23 16:45')),
                "end": FormatDateTime(new Date('2015-4-23 16:50'))
            },
            contentType: "application/json",
            success: function (initData) {

                if(JSON.stringify(initData)==='{}'){
                    console.log('失败了');
                    ajax()
                    return
                }
                data = initData['links'];
                nodeSum = initData['nodes'];
                info_chart.init(nodeSum, data.length);
                info_table.init(nodeSum);
                startData = transform(initData);
                preData = startData;
                layout = new d3layout(startData, width, height);
                layout.draw();
                // node_selected = d3.select('.node' + nodeSum[0].id)
                // node_selected.attr('fill',CLICK_SELECT_COLOR)
            },
            Error: function (error) {
                console.log(error);
            }
        });
    }

    IncrementalLayout.prototype.init = function () {
        control_chart.initParameters()
        ajax()
        // $.ajax({
        //     type: "get",
        //     dataType: "json",
        //     url: "/brush_extent",
        //     async: false,
        //     data: {
        //         "layout_type": now_layout_type,
        //         "start": FormatDateTime(new Date('2015-4-23 16:45')),
        //         "end": FormatDateTime(new Date('2015-4-23 16:50'))
        //     },
        //     contentType: "application/json",
        //     success: function (initData) {
        //         data = initData['links'];
        //         nodeSum = initData['nodes'];
        //         info_chart.init(nodeSum, data.length);
        //         info_table.init(nodeSum);
        //         startData = transform(initData);
        //         preData = startData;
        //         layout = new d3layout(startData, width, height);
        //         layout.draw();
        //         // node_selected = d3.select('.node' + nodeSum[0].id)
        //         // node_selected.attr('fill',CLICK_SELECT_COLOR)
        //     },
        //     Error: function (error) {
        //         console.log(error);
        //     }
        // });
    };


    IncrementalLayout.prototype.updateFromOthers = function (updateData) {
        data = updateData['links'];
        nodeSum = updateData['nodes'];
        info_chart.init(nodeSum, data.length);
        info_table.init(nodeSum);
        node_selected = null

        layout.force.stop();
        //只执行最开始的一次
        if (run) {
            layoutNodes = countArray(startData);
            run = false;
        }


        nowData = transform(updateData);
        var nowDatanode = findNode(nowData);
        var preDatanode = findNode(preData);
        var deleteNodeId, addNode; // deleteNode 删除节点
        deleteNodeId = difference(preDatanode, nowDatanode);
        var layoutSourTar = preData;
        addNode = difference(nowDatanode, preDatanode)
        preData = nowData;

        //  console.log('现在节点长度：' + Array.from(nowDatanode).length, '以前节点长度：'+ Array.from(preDatanode).length)

        //把当前的节点复制一份
        var perLayoutNodes = [];
        layoutNodes.forEach(function (d) {
            var dict = {
                'id': d.id,
                'age': d.age,
                'degree': d.degree,
                'links': [].concat(d.links),
                'x': d.x,
                'y': d.y,
                'subs': d.subs
            };
            perLayoutNodes.push(dict);
        });
        // console.log('以前的节点属性：');
        // console.log([].concat(perLayoutNodes));
        //前一时刻节点的节点数
        var perNodes = Array.from(preDatanode);
        nodesIdArray = [].concat(perNodes);

        var addNodes = [];
        var addEdges = [];
        //把前一时刻节点对象转化为字符串，方便比较其是否包含特定对象
        var layoutNodesStr = JSON.stringify(layoutSourTar);
        nowData.forEach(function (d, index) {
            var sourceId = d.source, targetId = d.target;
            //对象字符串
            var d_str = JSON.stringify(d);
            if (!layoutNodesStr.includes(d_str)) {
                if (nodesIdArray.includes(sourceId) && nodesIdArray.includes(targetId)) {
                    addEdges.push(d);
                } else {
                    addNodes.push(d);
                }
            }
        });

        layoutNodes = [].concat(deleteNodes(layoutNodes, nowData));//配置删除后的节点
        var aer = new AER(layoutNodes, addEdges, width, height);
        aer.start();//添加边时，位置变化
        var ssbm = new SSBM(layoutNodes, addNodes, width, height);
        ssbm.start();//初始化新增节点位置
        var age = new AGE(perLayoutNodes, layoutNodes, addNode);
        age.start();//设置年龄
        var repulsion = new RepulsionAll(layoutNodes, nowData, width, height);
        repulsion.start();//计算排斥力等，移动位置


        //   console.log('变化后的节点属性：')
        //   console.log([].concat(layoutNodes));
        drawing(layoutNodes, width, height); //重新绘制节点
    };

    function transform(initData) {
        var copylinks = initData.links.map(function (item) {
            return {source: item.source, target: item.target}
        })

        return copylinks.filter(function (d) {
            return d.source != d.target;
        })
    }

    function findNode(data) {
        var nodeData = new Set()
        data.forEach(function (item) {
            nodeData.add(item.source)
            nodeData.add(item.target)
        })
        return nodeData
    }

    function difference(thisSet, otherSet) {
        //初始化一个新集合，用于表示差集。
        var differenceSet = new Set();
        //将当前集合转换为数组
        var values = Array.from(thisSet);
        //遍历数组，如果另外一个集合没有该元素，则differenceSet加入该元素。
        for (var i = 0; i < values.length; i++) {
            if (!otherSet.has(values[i])) {
                differenceSet.add(values[i]);
            }
        }
        return Array.from(differenceSet)
    };


    function countArray(data) {
        var nodeDict = {};
        var layoutNodes = [];
        data.forEach(function (item) {

            if (nodeDict[item.source]) {
                nodeDict[item.source].push(item.target)
            } else {
                nodeDict[item.source] = [];
                nodeDict[item.source].push(item.target)
            }

            if (nodeDict[item.target]) {
                nodeDict[item.target].push(item.source)
            } else {
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


        for (var i = 0; i < layoutNodes.length; i++) {
            svg.append("g")
                .attr("class", "links")
                .selectAll("line")
                .data(layoutNodes[i].links).enter()
                .append("line")
                .attr("class", "link")
                .attr("stroke-width", 0.5)
                .attr("x1", layoutNodes[i].x)
                .attr("y1", layoutNodes[i].y)
                .attr("x2", function (d) {
                    return layoutNodes[id_index[d] - 0].x;
                })
                .attr("y2", function (d) {
                    return layoutNodes[id_index[d] - 0].y;
                })
                .attr("stroke", "gray")
                .on('click', edgeClick)
                .on("mouseover", linkMoveOver)
                .on("mouseout", linkMoveOut)

        }

        svg.append("g")
            .attr("class", "nodes")
            .selectAll("circle")
            .data(layoutNodes).enter()
            .append("circle")
            .attr("class", function (d) {
                return 'node ' + 'node' + d.id
            })
            .attr("r", 5)
            .attr("cx", function (d) {
                return d.x;
            })
            .attr("cy", function (d) {
                return d.y;
            })
            .attr("id", function (d) {
                return d.id;
            })
            .attr("fill", function (d) {
                return compute(linear(d.age))
            })
            .attr("stroke", "gray")
            .on('click', nodeClick)

        svg.append("g")
            .attr("class", "g_texts")
            .selectAll("text")
            .data(layoutNodes).enter()
            .append("text")
            .attr("class", "texts")
            .attr("visibility", label_vis)
            .attr("x", function (d) {
                return d.x
            })
            .attr("y", function (d) {
                return d.y
            })
            .attr("font-family", "sans-serif")
            .text(function (d) {
                d = nodeSum.find((item) => item.id == d.id)
                switch (LAYOUT_TYPE) {
                    case "编号":
                        return d.id
                        break;
                    case "度":
                        return d.degree;
                        break;
                    case "度中心性":
                        return d.degree_centrality
                        break;
                    case "接近中心性":
                        return d.closeness_centrality
                        break;
                    case "介数中心性":
                        return d.betweness_centrality
                        break;
                    case "特征向量中心性":
                        return d.eigenvector_centrality
                        break;
                    case "聚类系数":
                        return d.clustering
                        break;
                    case "端口":
                        return d.port
                        break;
                    case "连续属性":
                        return d.continuous
                        break;
                    case "离散属性":
                        return d.discrete
                        break;
                }
            })
            .attr("font-size", label_size)
            .attr("opacity", label_opacty)
            .attr("fill", label_stroke)
    }

    function idToIndex(layoutNodes) {
        var idIndex = {};
        layoutNodes.forEach(function (d) {
            idIndex[d.id] = d.subs;
        })
        return idIndex;
    }


    function edgeClick() {
        if (edge_selected !== null && edge_selected.attr('stroke') == CLICK_SELECT_COLOR) {
            edge_selected.attr('stroke', 'gray')
        }
        edge_selected = d3.select(this)
        d3.select(this).attr('stroke', CLICK_SELECT_COLOR)
    }

    function linkMoveOver() {
        if (d3.select(this).attr('stroke') !== 'gray') {
            edge_flag = true
            edge_color = d3.select(this).attr('stroke')
        } else {
            edge_flag = false
        }
        d3.select(this).attr("stroke", OVER_COLOR);
    }

    function linkMoveOut() {
        if (d3.select(this).attr('stroke') == CLICK_SELECT_COLOR) {
            return
        }
        if (edge_flag) {
            d3.select(this).attr("stroke", edge_color);
            return
        }
        d3.select(this).attr("stroke", 'gray');
    }

    function nodeClick(d) {
        if (node_selected !== null && node_selected.attr('fill') == CLICK_SELECT_COLOR) {
            node_selected.attr('fill', nodes_color)
        }
        d = nodeSum.find((item) => item.id == d.id)
        d3.select('.node' + d.id).attr('fill', CLICK_SELECT_COLOR)
        node_selected = d3.select('.node' + d.id);
        node_selected.attr('fill', CLICK_SELECT_COLOR)
        info_chart.update(d);
        control_chart.updateNode(d);
    }

    IncrementalLayout.prototype.setNodeStroke = function (node_stroke) {
        if (NODE_ALL) {
            nodes_stroke = node_stroke;
            d3.select('svg').selectAll("circle").attr("stroke", node_stroke);
        } else {
            node_selected.attr("stroke", node_stroke);
            node_selected.stroke = node_stroke;
        }
    };
    IncrementalLayout.prototype.setNodeSize = function (node_size) {

        if (NODE_ALL) {
            nodes_size = node_size;
            d3.select('svg').selectAll("circle").attr("r", node_size);
        } else {
            node_selected.attr("r", node_size);
            node_selected.stroke = node_size;
        }
    };

    IncrementalLayout.prototype.setNodeColor = function (node_color) {
        if (NODE_ALL) {
            nodes_color = node_color;
            d3.select('svg').selectAll("circle").attr("fill", node_color);
        } else {
            node_selected.attr("fill", node_color);
            node_selected.fill = node_color;
        }
    };

    IncrementalLayout.prototype.setNodeOpacity = function (node_opacity) {
        if (NODE_ALL) {
            nodes_opacity = node_opacity;
            d3.select('svg').selectAll("circle").attr("opacity", node_opacity);
        } else {
            node_selected.attr("opacity", node_opacity);
            node_selected.opacity = node_opacity;
        }
    };

    IncrementalLayout.prototype.setEdgeWidth = function (link_width) {
        if (EDGE_ALL) {
            links_stroke_width = link_width;
            d3.select('svg').selectAll(".link").attr("stroke-width", link_width);
        } else {
            edge_selected.attr("stroke-width", link_width);
            edge_selected.stroke_width = link_width;
        }
    };

    IncrementalLayout.prototype.setEdgeColor = function (edge_color) {
        if (EDGE_ALL) {
            links_color = edge_color;
            d3.select('svg').selectAll(".link").attr("stroke", edge_color);
        } else {
            edge_selected.attr("stroke", edge_color);
            edge_selected.stroke = edge_color;
        }
    };

    IncrementalLayout.prototype.setEdgeOpacity = function (edge_opacity) {
        if (EDGE_ALL) {
            links_opacity = edge_opacity;
            d3.select('svg').selectAll(".link").attr("stroke-opacity", edge_opacity);
        } else {
            edge_selected.attr("stroke-opacity", edge_opacity);
            edge_selected.opacity = edge_opacity;
        }

    };

    IncrementalLayout.prototype.setLabelType = function (value) {
        switch (value) {
            case "编号":
                d3.select('svg').selectAll('.texts').text(function (d) {
                    return d.id
                })
                break;
            case "度":
                d3.select('svg').selectAll('.texts').text(function (d) {
                    return d.degree;
                });
                break;
            case "度中心性":
                d3.select('svg').selectAll('.texts').text(function (d) {
                    for (var ii = 0; ii < nodeSum.length; ii++) {
                        if (nodeSum[ii]['id'] == d.id) {
                            return nodeSum[ii]['degree_centrality'];
                            break;
                        }
                    }
                });
                break;
            case "接近中心性":
                d3.select('svg').selectAll('.texts').text(function (d) {
                    for (var ii = 0; ii < nodeSum.length; ii++) {
                        if (nodeSum[ii]['id'] == d.id) {
                            return nodeSum[ii]['closeness_centrality'];
                            break;
                        }
                    }
                });
                break;
            case "介数中心性":
                d3.select('svg').selectAll('.texts').text(function (d) {
                    for (var ii = 0; ii < nodeSum.length; ii++) {
                        if (nodeSum[ii]['id'] == d.id) {
                            return nodeSum[ii]['betweness_centrality'];
                            break;
                        }
                    }
                });
                break;
            case "特征向量中心性":
                d3.select('svg').selectAll('.texts').text(function (d) {
                    for (var ii = 0; ii < nodeSum.length; ii++) {
                        if (nodeSum[ii]['id'] == d.id) {
                            return nodeSum[ii]['eigenvector_centrality'];
                            break;
                        }
                    }
                });
                break;
            case "聚类系数":
                d3.select('svg').selectAll('.texts').text(function (d) {
                    for (var ii = 0; ii < nodeSum.length; ii++) {
                        if (nodeSum[ii]['id'] == d.id) {
                            return nodeSum[ii]['clustering'];
                            break;
                        }
                    }
                });
                break;
            case "端口":
                d3.select('svg').selectAll('.texts').text(function (d) {
                    for (var ii = 0; ii < nodeSum.length; ii++) {
                        if (nodeSum[ii]['id'] == d.id) {
                            return nodeSum[ii]['port'];
                            break;
                        }
                    }
                });
                break;
            case "连续属性":
                d3.select('svg').selectAll('.texts').text(function (d) {
                    for (var ii = 0; ii < nodeSum.length; ii++) {
                        if (nodeSum[ii]['id'] == d.id) {
                            return nodeSum[ii]['continuous'];
                            break;
                        }
                    }
                });
                break;
            case "离散属性":
                d3.select('svg').selectAll('.texts').text(function (d) {
                    for (var ii = 0; ii < nodeSum.length; ii++) {
                        if (nodeSum[ii]['id'] == d.id) {
                            return nodeSum[ii]['discrete'];
                            break;
                        }
                    }
                });
                break;
        }
    };
    IncrementalLayout.label_show_flag = false;
    IncrementalLayout.prototype.setLabelShow = function (value) {
        IncrementalLayout.label_show_flag = value;
        if (IncrementalLayout.label_show_flag) {
            label_vis = 'visible';
            d3.select('svg').selectAll(".texts").attr("visibility", "visible");
        }
        else {
            label_vis = 'hidden';
            d3.select('svg').selectAll(".texts").attr("visibility", "hidden");
        }
    };


    IncrementalLayout.prototype.setLabelSize = function (font_size) {
        label_size = font_size;
        d3.select('svg').selectAll(".texts").attr("font-size", font_size);
    };

    IncrementalLayout.prototype.setLabelColor = function (font_color) {
        label_stroke = font_color;
        d3.select('svg').selectAll(".texts").attr("fill", font_color);
    };

    IncrementalLayout.prototype.setLabelOpacity = function (font_opacity) {
        label_opacty = font_opacity
        d3.select('svg').selectAll(".texts").attr("opacity", font_opacity);
    };

    IncrementalLayout.prototype.update = function (data) {
        d3.select('svg').selectAll("circle").attr("opacity", LOW_MAIN_OPACITY);
        data.forEach(function (value) {
            d3.select('svg').select(".node" + value).attr("opacity", REGION_OPACITY);
        });
    };

    IncrementalLayout.prototype.restore = function () {
        d3.select('svg').selectAll("circle").attr("opacity", function (d) {
            return 1;
        });
    };

    IncrementalLayout.prototype.saveShowedData = function () {

        // data = updateData['links'];
        // nodeSum = updateData['nodes'];
        var links_id = [];
        var result = {nodes: [], links: []};
        result.nodes = info_table.getData();
        data.forEach(function (link) {
            result.nodes.forEach(function (node) {
                if (link.source === node.id || link.target === node.id) {
                    if (links_id.indexOf(link.id) === -1) {
                        result.links.push(link);
                        links_id.push(link.id);
                    }
                }
            });
        });
        return result;
    };
}
