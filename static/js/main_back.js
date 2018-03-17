function BackChart() {
    var padding = {top: 50, bottom: 50, left: 70, right: 70};
    var main_div = $("#main");
    var mainChart = {
        width: main_div.width(),
        height: main_div.height(),
        svg: null,
        map_svg: null,
        mini_width: 200,
        mini_border: 2
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
            url: "/back_layout",
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

    function resizeFull() {
        mainChart.translate = [0, 0];
        mainChart.scale = 1;
        mainChart.g.attr("transform", "translate(" + mainChart.translate + ")scale(" + mainChart.scale + ")");
        mainChart.zoom.translate(mainChart.translate);
        mainChart.zoom.scale(mainChart.scale);
        mainChart.svg_links
            .attr("stroke-opacity", mainChart.now_link_opacity)
            .attr("x1", function (d) {
                return mainChart.x_scale(d.x1);
            })
            .attr("y1", function (d) {
                return mainChart.y_scale(d.y1);
            })
            .attr("x2", function (d) {
                return mainChart.x_scale(d.x2);
            })
            .attr("y2", function (d) {
                return mainChart.y_scale(d.y2);
            });
        mainChart.svg_nodes
            .attr("opacity", mainChart.now_node_opacity)
            .attr('cx', function (d) {
                return mainChart.x_scale(d.x);
            })
            .attr("cy", function (d) {
                return mainChart.y_scale(d.y);
            });
        mainChart.nodes_label
            .attr("x", function (d) {
                return mainChart.x_scale(d.x);
            })
            .attr("y", function (d) {
                return mainChart.y_scale(d.y);
            })
            .attr("transform", function (d) {
                return "rotate(30," + mainChart.x_scale(d.x) + " " + mainChart.y_scale(d.y) + ")"
            });
        mainChart.map_frame.attr("transform", "translate(0, 0)").attr("width", mainChart.mini_width).attr("height", mainChart.mini_height);
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
                    var true_node_x = d3.select(this).attr("cx");
                    var true_node_y = d3.select(this).attr("cy");
                    var node_x = mainChart.scale * parseFloat(true_node_x) + mainChart.translate[0];
                    var node_y = mainChart.scale * parseFloat(true_node_y) + mainChart.translate[1];
                    if (node_x >= parameters.x && node_x <= parameters.x + parameters.width &&
                        node_y >= parameters.y && node_y <= parameters.y + parameters.height) {
                        d3.select(this).attr("opacity", SELECT_OPACITY);
                        mainChart.links.forEach(function (item, j) {
                            if (item.source === every.id) {
                                d3.select("#link_" + j).attr("stroke-opacity", SELECT_OPACITY);
                                d3.select("#node_" + item.target + " circle").attr("opacity", SELECT_OPACITY);
                            }
                            if (item.target === every.id) {
                                d3.select("#link_" + j).attr("stroke-opacity", SELECT_OPACITY);
                                d3.select("#node_" + item.source + " circle").attr("opacity", SELECT_OPACITY);
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
        mainChart.g.attr("transform", "translate(" + mainChart.translate + ")scale(" + mainChart.scale + ")");
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

    function handleData(view_data) {
        mainChart.nodes = view_data.nodes;
        mainChart.links = view_data.links;

        mainChart.x_scale = d3.scale.linear().domain(d3.extent(mainChart.nodes, function (d) {
            return d.x;
        })).range([padding.left, mainChart.width - padding.right]);

        mainChart.y_scale = d3.scale.linear().domain(d3.extent(mainChart.nodes, function (d) {
            return d.y;
        })).range([padding.top, mainChart.height - padding.bottom]);

        mainChart.r_scale = d3.scale.linear().domain(d3.extent(mainChart.nodes, function (d) {
            return +d.degree;
        })).range(R_RANGE);
    }

    function drawGraph() {
        if (mainChart.svg) mainChart.svg.remove();
        if (mainChart.map_svg) mainChart.map_svg.remove();

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

        mainChart.g = mainChart.svg.append("g");

        mainChart.svg_links = mainChart.g.selectAll(".links")
            .data(mainChart.links)
            .enter()
            .append("line")
            .attr("id", function (d, i) {
                return "link_" + i;
            })
            .attr("x1", function (d) {
                return mainChart.x_scale(d.x1);
            })
            .attr("y1", function (d) {
                return mainChart.y_scale(d.y1);
            })
            .attr("x2", function (d) {
                return mainChart.x_scale(d.x2);
            })
            .attr("y2", function (d) {
                return mainChart.y_scale(d.y2);
            })
            .attr("stroke-opacity", mainChart.now_link_opacity)
            .attr("stroke", mainChart.now_link_color)
            .attr("stroke-width", mainChart.now_link_size);

        mainChart.drag = d3.behavior.drag()
            .on("drag", function (d) {
                var x = d3.mouse(this)[0];
                var y = d3.mouse(this)[1];
                d3.select(this).attr("cx", x).attr("cy", y);
                d3.select("#node_" + d.id + " text")
                    .attr("x", x)
                    .attr("y", y)
                    .attr("transform", "rotate(30," + x + " " + y + ")");
                mainChart.links.forEach(function (t, j) {
                    if (t.source === d.id) {
                        d3.select("#link_" + j).attr("x1", x);
                        d3.select("#link_" + j).attr("y1", y);
                    }
                    if (t.target === d.id) {
                        d3.select("#link_" + j).attr("x2", x);
                        d3.select("#link_" + j).attr("y2", y);
                    }
                })
            });

        mainChart.svg_nodes_g = mainChart.g.selectAll(".nodes")
            .data(mainChart.nodes)
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
            .attr('cx', function (d) {
                return mainChart.x_scale(d.x);
            })
            .attr("cy", function (d) {
                return mainChart.y_scale(d.y);
            })
            .call(mainChart.drag);

        mainChart.nodes_label = mainChart.svg_nodes_g.append("text")
            .attr("x", function (d) {
                return mainChart.x_scale(d.x);
            })
            .attr("y", function (d) {
                return mainChart.y_scale(d.y);
            })
            .attr("transform", function (d) {
                return "rotate(30," + mainChart.x_scale(d.x) + " " + mainChart.y_scale(d.y) + ")"
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
        mainChart.map_g = mainChart.map_svg.append("g");
        mainChart.map_g.selectAll(".m_links")
            .data(mainChart.links)
            .enter()
            .append("line")
            .attr("stroke-opacity", INIT_EDGE_OPACITY)
            .attr("stroke", INIT_EDGE_COLOR)
            .attr("stroke-width", INIT_EDGE_SIZE)
            .attr("x1", function (d) {
                return posMiniX(mainChart.x_scale(d.x1));
            })
            .attr("y1", function (d) {
                return posMiniY(mainChart.y_scale(d.y1));
            })
            .attr("x2", function (d) {
                return posMiniX(mainChart.x_scale(d.x2));
            })
            .attr("y2", function (d) {
                return posMiniY(mainChart.y_scale(d.y2));
            });

        mainChart.map_g.selectAll(".m_nodes")
            .data(mainChart.nodes)
            .enter()
            .append("circle")
            .attr("r", MINI_NODE_SIZE)
            .attr("opacity", INIT_NODE_OPACITY)
            .attr("fill", INIT_NODE_COLOR)
            .attr("cx", function (d) {
                return posMiniX(mainChart.x_scale(d.x));
            })
            .attr("cy", function (d) {
                return posMiniY(mainChart.y_scale(d.y));
            });

        mainChart.map_drag = d3.behavior.drag()
            .on("dragstart", function () {
                mainChart.mini_translate = d3.transform(mainChart.map_frame.attr("transform")).translate;
            })
            .on("drag", function () {
                mainChart.mini_translate[0] += d3.event.dx;
                mainChart.mini_translate[1] += d3.event.dy;
                mainChart.map_frame.attr("transform", "translate(" + mainChart.mini_translate[0] + "," + mainChart.mini_translate[1] + ")");
                var translate = [(-mainChart.mini_translate[0] / mainChart.mini_scale * mainChart.scale), (-mainChart.mini_translate[1] / mainChart.mini_scale * mainChart.scale)];
                mainChart.g.attr("transform", "translate(" + translate + ")scale(" + mainChart.scale + ")");
            });

        mainChart.map_frame = mainChart.map_svg.append("rect")
            .attr("class", "mini_background")
            .attr("width", mainChart.mini_width)
            .attr("height", mainChart.mini_height)
            .attr("cursor", "move")
            .call(mainChart.map_drag);
    }

    function posMiniX(x) {
        return x / mainChart.width * mainChart.mini_width;
    }

    function posMiniY(y) {
        return y / mainChart.height * mainChart.mini_height;
    }

    function nodeMoveOver(d) {
        info_chart.update(d);
        d3.select(this).attr("fill", OVER_NODE_COLOR);
        d3.select("#node_" + d.id + " text").attr("visibility", "visible");
        mainChart.links.forEach(function (t, j) {
            if (t.source === d.id) {
                d3.select("#link_" + j).attr("stroke", TARGET_NODE_COLOR);
                d3.select("#node_" + t.target + " circle").attr("fill", TARGET_NODE_COLOR);
                d3.select("#node_" + t.target + " text").attr("visibility", "visible");
            }
            else if (t.target === d.id) {
                d3.select("#link_" + j).attr("stroke", SOURCE_NODE_COLOR);
                d3.select("#node_" + t.source + " circle").attr("fill", SOURCE_NODE_COLOR);
                d3.select("#node_" + t.source + " text").attr("visibility", "visible");
            }
        })
    }

    function nodeMoveOut(d) {
        d3.select(this).attr("fill", mainChart.now_node_color);
        d3.select("#node_" + d.id + " text").attr("visibility", "hidden");
        mainChart.links.forEach(function (t, j) {
            if (t.source === d.id) {
                d3.select("#link_" + j).attr("stroke", mainChart.now_link_color);
                d3.select("#node_" + t.target + " circle").attr("fill", mainChart.now_node_color);
                d3.select("#node_" + t.target + " text").attr("visibility", "hidden");

            }
            else if (t.target === d.id) {
                d3.select("#link_" + j).attr("stroke", mainChart.now_link_color);
                d3.select("#node_" + t.source + " circle").attr("fill", mainChart.now_node_color);
                d3.select("#node_" + t.source + " text").attr("visibility", "hidden");
            }
        })
    }

    BackChart.prototype.update = function (data) {
        mainChart.svg_links.attr("stroke-opacity", LOW_MAIN_OPACITY);
        mainChart.svg_nodes.attr("opacity", LOW_MAIN_OPACITY);
        data.forEach(function (value) {
            d3.select("#node_" + value + " circle").attr("opacity", SELECT_OPACITY);
        });
    };

    BackChart.prototype.restore = function () {
        mainChart.svg_links.attr("stroke-opacity", mainChart.now_link_opacity);
        mainChart.svg_nodes.attr("opacity", mainChart.now_node_opacity);
    };

    BackChart.prototype.setNodeSize = function (nodeSize) {
        mainChart.svg_nodes.attr("r", function (d) {
            return mainChart.r_scale(d.degree) + nodeSize;
        });
        mainChart.now_node_size = nodeSize;
    };

    BackChart.prototype.setNodeColor = function (nodeColor) {
        mainChart.svg_nodes.attr("fill", nodeColor);
        mainChart.now_node_color = nodeColor;
    };

    BackChart.prototype.setNodeStroke = function (nodeStroke) {
        mainChart.svg_nodes.attr("stroke", nodeStroke);
        mainChart.now_node_stroke = nodeStroke;
    };

    BackChart.prototype.setNodeOpacity = function (nodeOpacity) {
        mainChart.svg_nodes.attr("opacity", nodeOpacity);
        mainChart.now_node_opacity = nodeOpacity;
    };

    BackChart.prototype.setEdgeWidth = function (edgeWidth) {
        mainChart.svg_links.attr("stroke-width", edgeWidth);
        mainChart.now_link_size = edgeWidth;
    };

    BackChart.prototype.setEdgeColor = function (edgeColor) {
        mainChart.svg_links.attr("stroke", edgeColor);
        mainChart.now_link_color = edgeColor;
    };

    BackChart.prototype.setEdgeOpacity = function (edgeOpacity) {
        mainChart.svg_links.attr("stroke-opacity", edgeOpacity);
        mainChart.now_link_opacity = edgeOpacity;
    };

    BackChart.prototype.setLabelSize = function (fontSize) {
        mainChart.nodes_label.attr("font-size", fontSize);
        mainChart.now_label_size = fontSize;
    };

    BackChart.prototype.setLabelColor = function (fontColor) {
        mainChart.nodes_label.attr("fill", fontColor);
        mainChart.now_label_color = fontColor;
    };

    BackChart.prototype.setLabelOpacity = function (fontOpacity) {
        mainChart.nodes_label.attr("opacity", fontOpacity);
        mainChart.now_label_opacity = fontOpacity;
    };

    BackChart.prototype.setLabelShow = function (value) {
        if (value)
            mainChart.nodes_label.attr("visibility", "visible");
        else
            mainChart.nodes_label.attr("visibility", "hidden");
    };

    BackChart.prototype.setLabelType = function (value) {
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

    BackChart.prototype.updateFromOthers = function (d) {
        run(d);
    }
}