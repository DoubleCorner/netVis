function BundleChart() {
    var main_div = $("#main");
    var mainChart = {
        width: main_div.width(),
        height: main_div.height(),
        radius: Math.min(main_div.width(), main_div.height()) / 2,
        svg: null,
        map_svg: null,
        mini_width: 200,
        mini_border: 2,
        mini_frame_padding: 10,
        padding: 40
    };
    init();
    fresh();

    function run(d) {
        info_chart.init(d.nodes, d.links.length);
        info_table.init(d.nodes);
        control_chart.initParameters();
        mainChart.now_node_color = INIT_NODE_COLOR;
        mainChart.now_node_stroke = INIT_NODE_STROKE;
        mainChart.now_node_size = INIT_NODE_SIZE;
        mainChart.now_node_opacity = INIT_NODE_OPACITY;
        mainChart.now_link_color = INIT_EDGE_COLOR;
        mainChart.now_link_size = INIT_EDGE_SIZE;
        mainChart.now_link_opacity = INIT_EDGE_OPACITY;
        mainChart.now_label_size = INIT_LABEL_SIZE;
        mainChart.now_label_color = INIT_LABEL_COLOR;
        mainChart.now_label_opacity = INIT_LABEL_OPACITY;
        handleData(d);
        drawGraph();
        miniMap();
    }

    function init() {
        mainChart.translate = [0, 0];
        mainChart.scale = 1;
        mainChart.zoom = d3.behavior.zoom()
            .scaleExtent(SCALE_EXTENT)
            .on("zoom", zoomed);

        mainChart.line = d3.svg.line.radial()
            .interpolate("bundle")
            .tension(0.85)
            .radius(function (d) {
                return d.y;
            })
            .angle(function (d) {
                return d.x / 180 * Math.PI;
            });

        mainChart.node_click_state = 0;
        mainChart.move_state = 0;
        mainChart.tools = d3.select("#main")
            .append("div")
            .attr("class", "btn-group")
            .style({
                "position": "absolute",
                "z-index": "999",
                "top": "2%",
                "left": "2%"
            })
            .selectAll("btn btn-default")
            .data(["refresh", "resize-full", "unchecked"])
            .enter()
            .append("button")
            .attr({
                "type": "button",
                "class": "btn btn-default"
            })
            .attr("title", function (d) {
                switch (d) {
                    case "refresh":
                        return "刷新";
                    case "resize-full":
                        return "重置";
                    case "unchecked":
                        return "框选";
                }
            });
        mainChart.tools.append("span")
            .attr("class", function (d) {
                return "glyphicon glyphicon-" + d;
            })
            .attr("aria-hidden", "true");

        mainChart.tools.on("click", function (d) {
            switch (d) {
                case "refresh":
                    fresh();
                    break;
                case "resize-full":
                    resizeFull();
                    break;
                case "unchecked":
                    regionSelect();
                    break;
            }
        });
        mainChart.parameters = d3.select("#main")
            .append("div")
            .attr("class", "parameters");

        mainChart.tension = mainChart.parameters.append("div").attr("class", "rows");
        mainChart.tension.append("span")
            .attr("class", "tip_label")
            .text("捆绑程度：");

        mainChart.tension.append("input")
            .attr("type", "range")
            .attr("min", 0)
            .attr("max", 100)
            .attr("value", 85)
            .style("background-size", "85% 100%")
            .on("input", function () {
                d3.select(this).style("background-size", (this.value - this.min) / (this.max - this.min) * 100 + "% 100%");
                mainChart.line.tension(this.value / this.max);
                /*重置数据，要会和小地图影响*/
                mainChart.cluster.size([360, mainChart.inner_radius]);
                mainChart.result_nodes = mainChart.cluster.nodes(mainChart.nodes_trans);
                mainChart.result_links = mainChart.bundle(reflection(mainChart.result_nodes, mainChart.links));
                mainChart.svg_links.attr("d", mainChart.line);

                mainChart.cluster.size([360, mainChart.mini_inner_radius]);
                mainChart.mini_result_nodes = mainChart.cluster.nodes(mainChart.nodes_trans);
                mainChart.mini_result_links = mainChart.bundle(reflection(mainChart.mini_result_nodes, mainChart.links));
                mainChart.mini_svg_links.attr("d", mainChart.line);
            });

        d3.select("#main")
            .append("div")
            .attr("id", "mini_map")
            .style("width", mainChart.mini_width + mainChart.mini_border + "px")
            .style("height", mainChart.mini_width + mainChart.mini_border + "px");
    }

    function fresh() {
        $.ajax({
            type: "get",
            dataType: "json",
            url: "/front_layout",
            data: {'layout_type': now_layout_type},
            async: true,
            contentType: "application/json",
            success: function (d) {
                run(d);
            },
            Error: function () {
                console.log("error");
            }
        });
    }

    function reflection(node, link) {
        var hash = [];
        for (var i = 0; i !== node.length; ++i) {
            hash[node[i].id] = node[i];
        }
        var edges = [];
        for (i = 0; i < link.length; i++) {
            edges.push({
                source: hash[link[i].source],
                target: hash[link[i].target]
            });
        }
        return edges;
    }

    function resizeFull() {
        mainChart.translate = [0, 0];
        mainChart.scale = 1;
        mainChart.g.style("transform", "translate(" + mainChart.translate[0] + "px," + mainChart.translate[1] + "px)scale(" + mainChart.scale + ")");
        mainChart.zoom.translate(mainChart.translate);
        mainChart.zoom.scale(mainChart.scale);
        mainChart.svg_links.attr("stroke-opacity", mainChart.now_link_opacity);
        mainChart.svg_nodes.attr("opacity", mainChart.now_node_opacity);
        mainChart.map_frame.attr("transform", "translate(5, 5)")
            .attr("width", mainChart.mini_width - mainChart.mini_frame_padding)
            .attr("height", mainChart.mini_height - mainChart.mini_frame_padding);
    }

    function regionSelect() {
        mainChart.node_click_state = 1;
        removeZoom();
        var start_pos;
        mainChart.svg.on("mousedown", function () {
            mainChart.move_state = 0;
            start_pos = d3.mouse(this);
            mainChart.svg.append("rect")
                .attr({
                    "class": "rect_selection",
                    "x": start_pos[0],
                    "y": start_pos[1]
                })
        }).on("mousemove", function () {
            var s = mainChart.svg.select(".rect_selection");
            if (!s.empty() && mainChart.move_state === 0) {
                var pos = d3.mouse(this);
                var parameters = {
                    x: Math.min(pos[0], start_pos[0]),
                    y: Math.min(pos[1], start_pos[1]),
                    width: Math.abs(start_pos[0] - pos[0]),
                    height: Math.abs(start_pos[1] - pos[1])
                };
                s.attr("x", parameters.x)
                    .attr("y", parameters.y)
                    .attr("width", parameters.width)
                    .attr("height", parameters.height);

                mainChart.svg_links.attr("stroke-opacity", LOW_MAIN_OPACITY);
                mainChart.svg_nodes.attr("opacity", LOW_MAIN_OPACITY);

                mainChart.svg_nodes.each(function (every) {
                    var cx = parseFloat(d3.select(this).attr("cx"));
                    var cy = parseFloat(d3.select(this).attr("cy"));
                    var node_x = mainChart.scale * cx + mainChart.translate[0] + mainChart.width / 2;
                    var node_y = mainChart.scale * cy + mainChart.translate[1] + mainChart.height / 2;
                    if (node_x >= parameters.x && node_x <= parameters.x + parameters.width &&
                        node_y >= parameters.y && node_y <= parameters.y + parameters.height) {
                        d3.select(this).attr("opacity", SELECT_OPACITY);
                        mainChart.result_links.forEach(function (item, j) {
                            if (item[0].id === every.id) {
                                d3.select("#link_" + j).attr("stroke-opacity", SELECT_OPACITY);
                                d3.select("#node_" + item[2].id + " circle").attr("opacity", SELECT_OPACITY);
                            }
                            if (item[2].id === every.id) {
                                d3.select("#link_" + j).attr("stroke-opacity", SELECT_OPACITY);
                                d3.select("#node_" + item[0].id + " circle").attr("opacity", SELECT_OPACITY);
                            }
                        });
                    }
                });
            }
        }).on("mouseup", function () {
            mainChart.move_state = 1;
            mainChart.svg.on("mousedown", null);
            mainChart.svg.on("mousemove", null);
            mainChart.svg.on("mouseup", null);
            mainChart.svg.selectAll("rect.rect_selection").remove();
            mainChart.rect.call(mainChart.zoom);
            mainChart.svg_nodes.on("mouseover", nodeMoveOver);
            mainChart.svg_nodes.on("mouseout", nodeMoveOut);
        })
    }

    function zoomed() {
        mainChart.translate = d3.event.translate;
        mainChart.scale = d3.event.scale;
        mainChart.g.style("transform", "translate(" + mainChart.translate[0] + "px," + mainChart.translate[1] + "px)scale(" + mainChart.scale + ")");
        mainChart.map_frame.attr("transform", "translate(" + (-mainChart.translate[0] * mainChart.mini_scale / mainChart.scale) + ","
            + (-mainChart.translate[1] * mainChart.mini_scale / mainChart.scale) + ")")
            .attr("width", mainChart.mini_width / mainChart.scale)
            .attr("height", mainChart.mini_height / mainChart.scale);
    }

    function removeZoom() {
        mainChart.rect.on(".zoom", null);//移除所有zoom事件
        mainChart.svg_nodes.on("mouseover", null);
        mainChart.svg_nodes.on("mouseout", null);
    }

    function handleData(d) {
        mainChart.nodes = d.nodes;
        mainChart.links = d.links;
        mainChart.nodes_trans = {
            id: "",
            children: mainChart.nodes
        };

        mainChart.r_scale = d3.scale.linear().domain(d3.extent(mainChart.nodes, function (d) {
            return +d.degree;
        })).range(R_RANGE);
    }

    function drawGraph() {
        if (mainChart.svg)
            mainChart.svg.remove();

        mainChart.inner_radius = mainChart.radius - mainChart.padding;
        mainChart.cluster = d3.layout.cluster()
            .size([360, mainChart.inner_radius])
            .sort(function (a, b) {
                return d3.ascending(a.key, b.key);
            });
        mainChart.result_nodes = mainChart.cluster.nodes(mainChart.nodes_trans);
        mainChart.bundle = d3.layout.bundle();
        mainChart.result_links = mainChart.bundle(reflection(mainChart.result_nodes, mainChart.links));

        mainChart.svg = d3.select("#main")
            .append("svg")
            .attr("width", mainChart.width)
            .attr("height", mainChart.height);

        mainChart.rect = mainChart.svg.append("rect")
            .attr("width", mainChart.width)
            .attr("height", mainChart.height)
            .attr("fill", "none")
            .attr("pointer-events", "all")
            .call(mainChart.zoom);
        mainChart.group = mainChart.svg.append("g")
            .attr("transform", "translate(" + mainChart.width / 2 + "," + mainChart.height / 2 + ")");

        /*mainChart.group的变换导致mainChart.g的坐标原点并不在左上角，而在svg的坐标变换中不能设置变换的相对坐标，但是css3可以设置相对坐标（attr使用svg变换，style使用css3变换）*/
        mainChart.g = mainChart.group.append("g")
            .style("transform-origin", (-mainChart.width / 2) + "px " + (-mainChart.height / 2) + "px");

        mainChart.svg_links = mainChart.g.selectAll(".links")
            .data(mainChart.result_links)
            .enter()
            .append("path")
            .attr("id", function (d, i) {
                return "link_" + i;
            })
            .attr("stroke-opacity", mainChart.now_link_opacity)
            .attr("stroke", mainChart.now_link_color)
            .attr("stroke-width", mainChart.now_link_size)
            .attr("fill", "none")
            .attr("d", mainChart.line);

        mainChart.svg_nodes_g = mainChart.g.selectAll(".nodes")
            .data(mainChart.result_nodes.filter(function (d) {
                return !d.children;
            }))
            .enter()
            .append("g")
            .attr("id", function (d) {
                return "node_" + d.id;
            });

        mainChart.svg_nodes = mainChart.svg_nodes_g.append("circle")
            .attr("r", function (d) {
                return mainChart.r_scale(+d.degree);
            })
            .attr("opacity", mainChart.now_node_opacity)
            .attr("fill", mainChart.now_node_color)
            .attr("stroke", mainChart.now_node_stroke)
            .attr("stroke-width", NODE_STROKE_WIDTH)
            .attr("cx", function (d) {
                return (d.y + 5) * Math.cos((d.x - 90) * Math.PI / 180);
            })
            .attr("cy", function (d) {
                return (d.y + 5) * Math.sin((d.x - 90) * Math.PI / 180);
            });

        mainChart.nodes_label = mainChart.svg_nodes_g.append("text")
            .attr("transform", function (d) {
                return "rotate(" + (d.x - 90) + ")translate(" + (d.y + 15) + ",0)" + (d.x < 180 ? "" : "rotate(180)");
            })
            .attr("dy", "2px")
            .attr("text-anchor", function (d) {
                return d.x < 180 ? "start" : "end";
            })
            .attr("fill", mainChart.now_label_color)
            .attr("font-size", mainChart.now_label_size)
            .attr("opacity", mainChart.now_label_opacity)
            .attr("visibility", "hidden")
            .attr("font-family", "sans-serif")
            .text(function (d) {
                return d.id;
            });

        mainChart.svg_nodes.on("mouseover", nodeMoveOver);

        mainChart.svg_nodes.on("mouseout", nodeMoveOut);

        mainChart.mini_height = mainChart.mini_width * (mainChart.height / mainChart.width);
        mainChart.mini_scale = mainChart.mini_width / mainChart.width;

        mainChart.map_svg = d3.select("#mini_map")
            .append("svg")
            .attr("width", mainChart.mini_width)
            .attr("height", mainChart.mini_height)
            .attr("transform", "translate(0," + (mainChart.mini_width - mainChart.mini_height) / 2 + ")");
    }

    function miniMap() {
        mainChart.mini_inner_radius = mainChart.mini_height / 2 - mainChart.padding * mainChart.mini_scale;
        mainChart.cluster.size([360, mainChart.mini_inner_radius]);
        mainChart.mini_result_nodes = mainChart.cluster.nodes(mainChart.nodes_trans);
        mainChart.mini_result_links = mainChart.bundle(reflection(mainChart.mini_result_nodes, mainChart.links));
        mainChart.map_group = mainChart.map_svg.append("g").attr("transform", "translate(" + mainChart.mini_width / 2 + "," + mainChart.mini_height / 2 + ")");
        mainChart.map_g = mainChart.map_group.append("g");
        mainChart.mini_svg_links = mainChart.map_g.selectAll(".m_links")
            .data(mainChart.mini_result_links)
            .enter()
            .append("path")
            .attr("stroke-opacity", INIT_EDGE_OPACITY)
            .attr("stroke", INIT_EDGE_COLOR)
            .attr("stroke-width", INIT_EDGE_SIZE)
            .attr("fill", "none")
            .attr("d", mainChart.line);

        mainChart.map_g.selectAll(".m_nodes")
            .data(mainChart.mini_result_nodes.filter(function (d) {
                return !d.children;
            }))
            .enter()
            .append("circle")
            .attr("r", MINI_NODE_SIZE)
            .attr("opacity", INIT_NODE_OPACITY)
            .attr("fill", INIT_NODE_COLOR)
            .attr("transform", function (d) {
                return "rotate(" + (d.x - 90) + ")translate(" + (d.y) + ",0)" + (d.x < 180 ? "" : "rotate(180)");
            });

        mainChart.map_drag = d3.behavior.drag()
            .on("dragstart", function () {
                mainChart.mini_translate = d3.transform(mainChart.map_frame.attr("transform")).translate;
            })
            .on("drag", function () {
                d3.event.sourceEvent.stopImmediatePropagation();
                mainChart.mini_translate[0] += d3.event.dx;
                mainChart.mini_translate[1] += d3.event.dy;
                mainChart.map_frame.attr("transform", "translate(" + mainChart.mini_translate[0] + "," + mainChart.mini_translate[1] + ")");
                var translate = [(-mainChart.mini_translate[0] / mainChart.mini_scale * mainChart.scale), (-mainChart.mini_translate[1] / mainChart.mini_scale * mainChart.scale)];
                mainChart.g.style("transform", "translate(" + translate[0] + "px," + translate[1] + "px)scale(" + mainChart.scale + ")");
            });

        mainChart.map_frame = mainChart.map_svg.append("rect")
            .attr("class", "mini_background")
            .attr("transform", "translate(5, 5)")
            .attr("width", mainChart.mini_width - mainChart.mini_frame_padding)
            .attr("height", mainChart.mini_height - mainChart.mini_frame_padding)
            .attr("cursor", "move")
            .call(mainChart.map_drag);

    }

    function nodeMoveOver(d) {
        info_chart.update(d);
        d3.select(this).attr("fill", OVER_NODE_COLOR);
        d3.select("#node_" + d.id + " text").attr("visibility", "visible");
        mainChart.result_links.forEach(function (item, j) {
            if (item[0].id === d.id) {
                d3.select("#link_" + j).attr("stroke", TARGET_NODE_COLOR);
                d3.select("#node_" + item[2].id + " circle").attr("fill", TARGET_NODE_COLOR);
                d3.select("#node_" + item[2].id + " text").attr("visibility", "visible");
            }
            else if (item[2].id === d.id) {
                d3.select("#link_" + j).attr("stroke", SOURCE_NODE_COLOR);
                d3.select("#node_" + item[0].id + " circle").attr("fill", SOURCE_NODE_COLOR);
                d3.select("#node_" + item[0].id + " text").attr("visibility", "visible");
            }
        });
    }

    function nodeMoveOut(d) {
        d3.select(this).attr("fill", mainChart.now_node_color);
        d3.select("#node_" + d.id + " text").attr("visibility", "hidden");
        mainChart.result_links.forEach(function (item, j) {
            if (item[0].id === d.id) {
                d3.select("#link_" + j).attr("stroke", mainChart.now_link_color);
                d3.select("#node_" + item[2].id + " circle").attr("fill", mainChart.now_node_color);
                d3.select("#node_" + item[2].id + " text").attr("visibility", "hidden");
            }
            else if (item[2].id === d.id) {
                d3.select("#link_" + j).attr("stroke", mainChart.now_link_color);
                d3.select("#node_" + item[0].id + " circle").attr("fill", mainChart.now_node_color);
                d3.select("#node_" + item[0].id + " text").attr("visibility", "hidden");
            }
        })
    }

    BundleChart.prototype.update = function (data) {
        mainChart.svg_links.attr("stroke-opacity", LOW_MAIN_OPACITY);
        mainChart.svg_nodes.attr("opacity", LOW_MAIN_OPACITY);
        data.forEach(function (value) {
            d3.select("#node_" + value + " circle").attr("opacity", SELECT_OPACITY);
        });
    };

    BundleChart.prototype.restore = function () {
        mainChart.svg_links.attr("stroke-opacity", mainChart.now_link_opacity);
        mainChart.svg_nodes.attr("opacity", mainChart.now_node_opacity);
    };

    BundleChart.prototype.setNodeSize = function (nodeSize) {
        mainChart.svg_nodes.attr("r", function (d) {
            return mainChart.r_scale(d.degree) + nodeSize;
        });
        mainChart.now_node_size = nodeSize;
    };

    BundleChart.prototype.setNodeStroke = function (nodeStroke) {
        mainChart.svg_nodes.attr("stroke", nodeStroke);
        mainChart.now_node_stroke = nodeStroke;
    };

    BundleChart.prototype.setNodeColor = function (nodeColor) {
        mainChart.svg_nodes.attr("fill", nodeColor);
        mainChart.now_node_color = nodeColor;
    };

    BundleChart.prototype.setNodeOpacity = function (nodeOpacity) {
        mainChart.svg_nodes.attr("opacity", nodeOpacity);
        mainChart.now_node_opacity = nodeOpacity;
    };

    BundleChart.prototype.setEdgeWidth = function (edgeWidth) {
        mainChart.svg_links.attr("stroke-width", edgeWidth);
        mainChart.now_link_size = edgeWidth;
    };

    BundleChart.prototype.setEdgeColor = function (edgeColor) {
        mainChart.svg_links.attr("stroke", edgeColor);
        mainChart.now_link_color = edgeColor;
    };

    BundleChart.prototype.setEdgeOpacity = function (edgeOpacity) {
        mainChart.svg_links.attr("stroke-opacity", edgeOpacity);
        mainChart.now_link_opacity = edgeOpacity;
    };

    BundleChart.prototype.setLabelSize = function (fontSize) {
        mainChart.nodes_label.attr("font-size", fontSize);
        mainChart.now_label_size = fontSize;
    };

    BundleChart.prototype.setLabelColor = function (fontColor) {
        mainChart.nodes_label.attr("fill", fontColor);
        mainChart.now_label_color = fontColor;
    };

    BundleChart.prototype.setLabelOpacity = function (fontOpacity) {
        mainChart.nodes_label.attr("opacity", fontOpacity);
        mainChart.now_label_opacity = fontOpacity;
    };

    BundleChart.prototype.setLabelShow = function (value) {
        if (value)
            mainChart.nodes_label.attr("visibility", "visible");
        else
            mainChart.nodes_label.attr("visibility", "hidden");
    };

    BundleChart.prototype.setLabelType = function (value) {
        switch (value) {
            case "编号":
                mainChart.nodes_label.text(function (d) {
                    return d.id;
                });
                break;
            case "度":
                mainChart.nodes_label.text(function (d) {
                    return d.degree;
                });
                break;
            case "度中心性":
                mainChart.nodes_label.text(function (d) {
                    return d.degree_centrality;
                });
                break;
            case "接近中心性":
                mainChart.nodes_label.text(function (d) {
                    return d.closeness_centrality;
                });
                break;
            case "介数中心性":
                mainChart.nodes_label.text(function (d) {
                    return d.betweness_centrality;
                });
                break;
            case "特征向量中心性":
                mainChart.nodes_label.text(function (d) {
                    return d.eigenvector_centrality;
                });
                break;
            case "聚类系数":
                mainChart.nodes_label.text(function (d) {
                    return d.clustering;
                });
                break;
        }
    };

    BundleChart.prototype.updateFromTime = function (d) {
        run(d);
    }
}
