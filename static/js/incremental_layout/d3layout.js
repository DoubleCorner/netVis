/**
 * Created by zhangye on 2018/6/6.
 */
function d3layout(data, width, height) {
    var tmp_nodes = [];
    var index_of_nodes = [];
    var nodeNumber = 0;
    var links = [];
    var nodes = [];
    var nodeDict = {}
    this.draw = function () {
        data.forEach(function (item) {
            tmp_nodes.push(item.source);
            tmp_nodes.push(item.target);

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


        tmp_nodes = this.unique(tmp_nodes);
        index_of_nodes = d3.map();
        nodeNumber = tmp_nodes.length;
        //根据新增节点与已存在的节点的连接的度的大小顺序（升序）
        tmp_nodes.sort(function compare(a, b) {
            return a - b
        });
        for (var i = 0; i !== tmp_nodes.length; ++i) {
            var node = {id: tmp_nodes[i]};
            nodes.push(node);

            index_of_nodes.set(tmp_nodes[i], i);
        }

        data.forEach(function (item) {
            var link = {
                source: index_of_nodes.get(item.source),
                target: index_of_nodes.get(item.target)
            };
            links.push(link);
        });


        var svg = d3.select("#main")
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        this.force = d3.layout.force()
            .nodes(nodes)
            .links(links)
            //     .linkDistance(50)
            .size([width, height])


        this.force.start();


        var svg_links = svg.selectAll(".link")
            .data(links)
            .enter()
            .append("line")
            .attr("class", "link")
            .attr("stroke-opacity", 0.9)
            .attr("stroke", "gray")
            .on('click', edgeClick)
            .on("mouseover", linkMoveOver)
            .on("mouseout", linkMoveOut)


        var svg_nodes = svg.selectAll(".node")
            .data(nodes)
            .enter()
            .append("circle")
            .attr("class", function (d) {
                return 'node ' + 'node' + d.id
            })
            .attr("r", function (d) {
                return 5;
            })
            .attr("id", function (d) {
                return d.id;
            })
            .attr("opacity", 1)
            .attr("stroke", "red")
            .attr("fill", "red")
            .on('click', nodeClick)
        //.call(mainChart.force.drag);


        var svg_text = svg.append("g")
            .attr("class", "g_texts")
            .selectAll("text")
            .data(nodes).enter()
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


        this.force.on("tick", function () {
            svg_links.attr("x1", function (d) {
                return d.source.x;
            });
            svg_links.attr("y1", function (d) {
                return d.source.y;
            });
            svg_links.attr("x2", function (d) {
                return d.target.x;
            });
            svg_links.attr("y2", function (d) {
                return d.target.y;
            });

            svg_nodes.attr("cx", function (d) {
                return d.x;
            });
            svg_nodes.attr("cy", function (d) {
                return d.y;
            });

            svg_text.attr("x", function (d) {
                return d.x
            })
            svg_text.attr("y", function (d) {
                return d.y
            })

        });
        var count = 0;


    }
    this.unique = function (arr) {
        var result = [],
            hash = {};
        for (var i = 0, elem;
             (elem = arr[i]) != null; i++) {
            if (!hash[elem]) {
                result.push(elem);
                hash[elem] = true;
            }
        }
        return result;

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
}


