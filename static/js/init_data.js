var init_data_line;
var time_chart;

function InitData() {
    $.ajax({
        type: "get",
        dataType: "json",
        url: "/initial",
        async: true,
        contentType: "application/json",
        success: function (data) {
            currentTime();
            init_data_line = data;
            init_data_line.forEach(function (every) {
                every.date = new Date(every.date);
                every.value = +every.value;
            });
            AreaChart();
            time_chart = new TimeLineChart();
            document.addEventListener("visibilitychange", time_chart.userLeave, true);
        },
        Error: function () {
            console.log("error");
        }
    });

    $(window).resize(function () {
        window.location.reload();
    });

    function currentTime() {
        var date = FormatDateTime((new Date()));
        $("#header").find(".time").text(date);
    }

    window.setInterval(currentTime, 60000);
}

InitData();