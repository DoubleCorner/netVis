function TimeLineChart() {
    var timeChart = {timer: null, tools_width: 60, play_pause: true};
    var time_line = $("#time_line");
    var now_time_index = 0;

    init();
    createChart();

    function init() {
        timeChart.tools = d3.select("#time_line").append("div")
            .attr("id", "time_line_tools")
            .style("width", timeChart.tools_width + "px")
            .style("height", time_line.height() + "px")
            .append("div")
            .attr("class", "btn-group-vertical");

        timeChart.button_play = timeChart.tools.append("button")
            .attr({
                "type": "button",
                "class": "btn btn-default"
            })
            .attr("title", "点击播放")
            .on("click", function () {
                if (timeChart.play_pause) {
                    d3.select(this).attr("title", "点击暂停");
                    d3.select(this).select("span").attr("class", "glyphicon glyphicon-pause");
                    timeChart.play_pause = false;
                    play();
                    timeChart.button_earse.remove();
                }
                else {
                    d3.select(this).attr("title", "点击播放");
                    d3.select(this).select("span").attr("class", "glyphicon glyphicon-play");
                    timeChart.play_pause = true;
                    stop();
                }
            });
        timeChart.button_play.append("span")
            .attr("class", "glyphicon glyphicon-play")
            .attr("aria-hidden", "true");
    }

    function createErase() {
        timeChart.button_earse = timeChart.tools.append("button")
            .attr({
                "type": "button",
                "class": "btn btn-default"
            })
            .attr("title", "清空选定")
            .on("click", function () {
                clearBrush();
            });
        timeChart.button_earse.append("span")
            .attr("class", "glyphicon glyphicon-erase")
            .attr("aria-hidden", "true");
    }

    function createChart() {
        timeChart.numbers = 35;
        timeChart.width = time_line.width() - timeChart.tools_width;
        timeChart.height = time_line.height();
        timeChart.padding = {left: 35, right: 15, top: 10, bottom: 20};
        timeChart.padding_width = timeChart.width - timeChart.padding.left - timeChart.padding.right;
        timeChart.padding_height = timeChart.height - timeChart.padding.top - timeChart.padding.bottom;
        timeChart.svg = d3.select("#time_line").append("svg")
            .style("position", "absolute")
            .style("left", timeChart.tools_width + "px")
            .attr("width", timeChart.width)
            .attr("height", timeChart.height);

        /**比例尺**/
        timeChart.x_scale = d3.time.scale()
            .domain([init_data_line[0].date, init_data_line[timeChart.numbers].date])
            .range([0, timeChart.padding_width]);
        timeChart.y_scale = d3.scale.linear()
            .domain([0, 10])
            .range([timeChart.padding_height, 0]);

        /***创建轴线***/
        //x轴线
        timeChart.x_axis = d3.svg.axis()
            .scale(timeChart.x_scale)
            .orient("bottom")
            .ticks(30);
        //y方向上的轴线
        timeChart.y_axis = d3.svg.axis()
            .scale(timeChart.y_scale)
            .orient("left")
            .ticks(5);
        //定义剪切位置
        timeChart.svg.append("clipPath")
            .attr("id", "chart-area")
            .append("rect")
            .attr("x", timeChart.padding.left)
            .attr("y", timeChart.padding.top)
            .attr("width", timeChart.padding_width)
            .attr("height", timeChart.padding_height);

        //绘制矩形、绑定剪切 添加关于rect的事件
        timeChart.rects = timeChart.svg.append("g")
            .attr("clip-path", "url(#chart-area)")
            .selectAll(".rects")
            .data(init_data_line)
            .enter()
            .append("rect")
            .attr("transform", "translate(" + timeChart.padding.left + "," + timeChart.padding.top + ")")
            .attr("fill", INIT_RECT_COLOR)
            .attr("opacity", INIT_RECT_OPACITY)
            .attr("x", function (d) {
                return timeChart.x_scale(d.date);
            })
            .attr("y", function (d) {
                return timeChart.y_scale(d.value);
            })
            .attr("width", timeChart.padding_width / timeChart.numbers - 1)
            .attr("height", function (d) {
                return timeChart.padding_height - timeChart.y_scale(d.value);
            });

        timeChart.svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(" + timeChart.padding.left + "," + (timeChart.height - timeChart.padding.bottom) + ")")
            .call(timeChart.x_axis);

        timeChart.svg.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(" + timeChart.padding.left + "," + timeChart.padding.top + ")")
            .call(timeChart.y_axis);
        stop();
    }

    function play() {
        removeBrush();
        timeChart.timer = setInterval(function () {
            var maxData = 1;
            for (var j = now_time_index; j <= now_time_index + timeChart.numbers; j++) {
                if (init_data_line[j].value >= maxData) {
                    maxData = init_data_line[j].value;
                }
            }
            if (maxData < 10)
                maxData = 10;
            //新的比例尺
            timeChart.x_scale.domain([init_data_line[now_time_index].date, init_data_line[timeChart.numbers + now_time_index].date]);
            timeChart.y_scale.domain([0, maxData]);
            now_time_index++;
            //重新加载的轴和条形图
            timeChart.rects.transition()
                .ease("linear")
                .duration(REFRESH_FREQUENCY)
                .attr("x", function (d) {
                    return timeChart.x_scale(d.date);
                })
                .attr("y", function (d) {
                    return timeChart.y_scale(d.value);
                });

            timeChart.svg.select("g.x.axis")
                .transition()
                .ease("linear")
                .duration(REFRESH_FREQUENCY)
                .call(timeChart.x_axis.scale(timeChart.x_scale));

            timeChart.svg.select("g.y.axis")
                .transition()
                .ease("linear")
                .duration(REFRESH_FREQUENCY)
                .call(timeChart.y_axis.scale(timeChart.y_scale));

            //防止数据越界
            if (now_time_index >= init_data_line.length - timeChart.numbers) {
                now_time_index = 0;
            }
            updateMain([init_data_line[now_time_index].date, init_data_line[now_time_index + 1].date]);
        }, REFRESH_FREQUENCY, 90);
    }

    function stop() {
        createErase();
        createBrush();
        clearInterval(timeChart.timer);
    }

    function brushEnd() {
        var extent = timeChart.brush.extent();
        extent[0].setMinutes(extent[0].getMinutes() - extent[0].getMinutes() % TIME_INTERVAL);
        extent[1].setMinutes(extent[1].getMinutes() - extent[1].getMinutes() % TIME_INTERVAL);
        extent[0].setSeconds(0);
        extent[1].setSeconds(0);
        extent[0].setMilliseconds(0);
        extent[1].setMilliseconds(0);
        if (extent[0].getTime() !== timeChart.brush_extent[0].getTime() || extent[1].getTime() !== timeChart.brush_extent[1].getTime()) {
            timeChart.brush_extent = extent;
            timeChart.brush.extent(timeChart.brush_extent);
            timeChart.brush(timeChart.g_brush.transition());
            timeChart.brush.event(timeChart.g_brush.transition().delay(500));
            var packages = (timeChart.brush_extent[1].getTime() - timeChart.brush_extent[0].getTime()) / (1000 * 60 * TIME_INTERVAL);
            if (packages > MAX_PACKAGES) {
                alert("请选择小于等于10的包数！");
                clearBrush();
                return false;
            }
            else if (!timeChart.brush.empty())
                updateMain(timeChart.brush_extent);
        }
    }

    function updateMain(extent) {
        $.ajax({
            type: "get",
            dataType: "json",
            url: "/brush_extent",
            data: {
                "layout_type": now_layout_type,
                "start": FormatDateTime(extent[0]),
                "end": FormatDateTime(extent[1])
            },
            contentType: "application/json",
            success: function (d) {
                now_layout.updateFromOthers(d);
            },
            Error: function () {
                console.log("error");
            }
        });
    }

    function clearBrush() {
        if (!timeChart.brush.empty()) {
            timeChart.brush.clear();
            timeChart.brush(timeChart.g_brush.transition());
            timeChart.brush.event(timeChart.g_brush.transition().delay(500));
        }
    }

    function createBrush() {
        timeChart.brush = d3.svg.brush()
            .x(timeChart.x_scale)
            .on("brushend", brushEnd);
        timeChart.g_brush = timeChart.svg.append("g")
            .attr("class", "brush")
            .attr("transform", "translate(" + timeChart.padding.left + "," + timeChart.padding.top + ")")
            .call(timeChart.brush);
        timeChart.g_brush.selectAll("rect").attr("height", timeChart.padding_height);
        timeChart.brush_extent = [new Date('1970-1-1'), new Date('1970-1-2')];
    }

    function removeBrush() {
        timeChart.g_brush.remove();
        timeChart.brush = null;
        timeChart.g_brush = null;
    }

    TimeLineChart.prototype.userLeave = function () {
        if (document.hidden && !timeChart.play_pause) {
            stop();
            timeChart.button_play.attr("title", "点击播放");
            timeChart.button_play.select("span").attr("class", "glyphicon glyphicon-play");
            timeChart.play_pause = true;
        }
    };
}

/**
 * @return {string}
 */
function FormatDateTime(date) {
    var y = date.getFullYear();
    var m = date.getMonth() + 1;
    m = m < 10 ? ('0' + m) : m;
    var d = date.getDate();
    d = d < 10 ? ('0' + d) : d;
    var h = date.getHours();
    h = h < 10 ? ('0' + h) : h;
    var minute = date.getMinutes();
    minute = minute < 10 ? ('0' + minute) : minute;
    return y + '-' + m + '-' + d + ' ' + h + ':' + minute;
}

var INIT_RECT_COLOR = "#C4C9CF";
var TIME_INTERVAL = 5;
var MAX_PACKAGES = 10;
var INIT_RECT_OPACITY = 0.9;
var REFRESH_FREQUENCY = 10000;
