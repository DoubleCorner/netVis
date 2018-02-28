function ControlChart() {
    var obj = {
        '节点尺寸增量': INIT_NODE_SIZE,
        '节点边线': INIT_NODE_STROKE,
        '节点填充': INIT_NODE_COLOR,
        '节点透明度': INIT_NODE_OPACITY,
        '边宽度': INIT_EDGE_SIZE,
        '边填充': INIT_EDGE_COLOR,
        '边透明度': INIT_EDGE_OPACITY,
        '标签类别': "编号",
        '标签显示': false,
        '标签填充': INIT_LABEL_COLOR,
        '标签尺寸': INIT_LABEL_SIZE,
        '标签透明度': INIT_LABEL_OPACITY,
        '布局': '力导向布局',
        '主视图截图': function () {
            if ($("#header").attr("Capture") !== "Ready") alert("插件未安装!");
        },
        '自定义截图': function () {
            if ($("#header").attr("Capture") !== "Ready") alert("插件未安装!");
        },
        '筛选数据保存': function () {
            Export.saveAsCsv(info_table.getData());
        }

    };
    /*默认初始化布局*/
    now_layout_type = 'force';
    now_layout = new ForceChart();
    var gui = new dat.gui.GUI();

    var f1 = gui.addFolder('节点');
    var node_stroke = f1.addColor(obj, '节点边线').listen();
    var node_size = f1.add(obj, '节点尺寸增量').min(0).max(5).step(1).listen();
    var node_color = f1.addColor(obj, '节点填充').listen();
    var node_opacity = f1.add(obj, '节点透明度').min(0).max(1).step(0.05).listen();
    /*节点信息监听*/
    node_stroke.onFinishChange(function (value) {
        now_layout.setNodeStroke(value);
    });
    node_size.onFinishChange(function (value) {
        now_layout.setNodeSize(value);
    });
    node_color.onFinishChange(function (value) {
        now_layout.setNodeColor(value);
    });
    node_opacity.onFinishChange(function (value) {
        now_layout.setNodeOpacity(value);
    });
    var f2 = gui.addFolder('边');
    var edge_width = f2.add(obj, '边宽度').min(1).max(5).step(1).listen();
    var edge_color = f2.addColor(obj, '边填充').listen();
    var edge_opacity = f2.add(obj, '边透明度').min(0).max(1).step(0.05).listen();
    /*边信息监听*/
    edge_width.onFinishChange(function (value) {
        now_layout.setEdgeWidth(value);
    });
    edge_color.onFinishChange(function (value) {
        now_layout.setEdgeColor(value);
    });
    edge_opacity.onFinishChange(function (value) {
        now_layout.setEdgeOpacity(value);
    });
    var f3 = gui.addFolder('标签');
    var label_type = f3.add(obj, '标签类别', ['编号', '度', '度中心性', '接近中心性', '介数中心性', '特征向量中心性', '聚类系数']).listen();
    var label_show = f3.add(obj, '标签显示').listen();
    var label_size = f3.add(obj, '标签尺寸').min(5).max(18).step(1).listen();
    var label_color = f3.addColor(obj, '标签填充').listen();
    var label_opacity = f3.add(obj, '标签透明度').min(0).max(1).step(0.05).listen();
    /*标签信息监听*/
    label_type.onChange(function (value) {
        now_layout.setLabelType(value);
    });
    label_show.onFinishChange(function (value) {
        now_layout.setLabelShow(value);
    });
    label_size.onFinishChange(function (value) {
        now_layout.setLabelSize(value);
    });
    label_color.onFinishChange(function (value) {
        now_layout.setLabelColor(value);
    });
    label_opacity.onFinishChange(function (value) {
        now_layout.setLabelOpacity(value);
    });

    var layout_text = gui.add(obj, '布局', ['力导向布局', '捆图布局', '随机布局', '椭圆布局', 'graphopt布局', '多元尺度布局', '网格布局', '大图布局', '分布式递归布局', '层次化布局', '环状RT树布局']);
    /*布局信息监听*/
    layout_text.onChange(function (value) {
        clearMainChart();
        control_chart.initParameters();
        switch (value) {
            case '力导向布局':
                now_layout_type = 'force';
                now_layout = new ForceChart();
                break;
            case '捆图布局':
                now_layout_type = 'bundle';
                now_layout = new BundleChart();
                break;
            case '随机布局':
                now_layout_type = 'random';
                now_layout = new BackChart();
                break;
            case '椭圆布局':
                now_layout_type = 'circle';
                now_layout = new BackChart();
                break;
            case 'graphopt布局':
                now_layout_type = 'graphopt';
                now_layout = new BackChart();
                break;
            case '多元尺度布局':
                now_layout_type = 'mds';
                now_layout = new BackChart();
                break;
            case '网格布局':
                now_layout_type = 'grid';
                now_layout = new BackChart();
                break;
            case '大图布局':
                now_layout_type = 'lgl';
                now_layout = new BackChart();
                break;
            case '分布式递归布局':
                now_layout_type = 'drl';
                now_layout = new BackChart();
                break;
            case '层次化布局':
                now_layout_type = 'sugiyama';
                now_layout = new BackChart();
                break;
            case '环状RT树布局':
                now_layout_type = 'rt_circular';
                now_layout = new BackChart();
                break;
            default:
                break;
        }
    });

    var f4 = gui.addFolder('工具');
    f4.add(obj, '主视图截图');
    f4.add(obj, '自定义截图');
    f4.add(obj, '筛选数据保存');
    f1.open();
    f2.open();
    f3.open();
    f4.open();

    document.getElementById('control').appendChild(gui.domElement);

    var clearMainChart = function () {
        document.getElementById("main").innerHTML = "";
    };

    ControlChart.prototype.initParameters = function () {
        obj.节点边线 = INIT_NODE_STROKE;
        obj.节点尺寸增量 = INIT_NODE_SIZE;
        obj.节点填充 = INIT_NODE_COLOR;
        obj.边宽度 = INIT_EDGE_SIZE;
        obj.节点透明度 = INIT_NODE_OPACITY;
        obj.边填充 = INIT_EDGE_COLOR;
        obj.边透明度 = INIT_EDGE_OPACITY;
        obj.标签显示 = false;
        obj.标签填充 = INIT_LABEL_COLOR;
        obj.标签尺寸 = INIT_LABEL_SIZE;
        obj.标签透明度 = INIT_LABEL_OPACITY;
        obj.标签类别 = "编号";
    };
}

var now_layout;
var now_layout_type = "";
var INIT_NODE_COLOR = "#C4C9CF";
var INIT_NODE_STROKE = "#FFFAF0";
var INIT_EDGE_COLOR = "#808080";
var INIT_LABEL_COLOR = "#FFFFFF";
var OVER_NODE_COLOR = "#FF4500";
var TARGET_NODE_COLOR = "#6A5ACD";
var SOURCE_NODE_COLOR = "#32CD32";
var SELECT_OPACITY = 1;
var NODE_STROKE_WIDTH = 1.5;
var INIT_NODE_SIZE = 0;
var INIT_EDGE_SIZE = 1;
var INIT_NODE_OPACITY = 0.9;
var INIT_EDGE_OPACITY = 0.7;
var INIT_LABEL_SIZE = 8;
var INIT_LABEL_OPACITY = 1;
var MINI_NODE_SIZE = 1;
var LOW_MAIN_OPACITY = 0.2;
var R_RANGE = [3, 15];
var SCALE_EXTENT = [0.5, 128];
var control_chart = new ControlChart();