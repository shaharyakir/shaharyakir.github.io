var that = {};

/*
 Gloabal Vars
 */
var currentProject;
var currentProjectTitle;
var timeOut = 0;
var chartWidth;
var oldChartWidth;

/* Settings*/
var setting_show_breaks_on_graphs = false;

that.Async = {
    queue: function (func) {
        $(document).queue('tasks', this.createTask(func));
    },
    queueCallback: function (func) {
        this.queue(func);
    },
    dequeue: function () {
        $(document).dequeue('tasks');
    },
    createTask: function (func) {
        return function (next) {
            func.then(function () {
            });
        }
    }
}
that.Chart = {

    renderCharts: function () {
        that.Chart.dailyChart();
        that.Chart.weeklyChart();
        that.Chart.monthlyChart();
        that.Chart.totalChart();
    },
    dailyChart: function (date) {

        var promise = $.Deferred();
        var dps = [];
        var manualDps = [];
        var goalDps = [];
        var firstLap;
        var manualLapCount = 0;
        var length = 0;

        $('#chart_today_chart').text("");
        var dateToCheck = date ? date : that.Utils.Date.getShortDate();

        toggleLoading('#chart_caption');


        // TODO: handle a case when there's no first lap!!!
        that.Laps.findFirstLapInDay(dateToCheck)  // Get the first lap (use it as the manual lap start time)
            .then(function (result) {
                if (result) {
                    firstLap = result;
                }
                ;
            })
            .then(function () {
                return that.Laps.getManualLapTotalLength(dateToCheck);  // Get today's total manual lap time
            })
            .then(function (result) {
                manualLapCount = result;
                if (manualLapCount > 0) {
                    length = manualLapCount;
                    manualDps.push({x: firstLap, y: 0, markerColor: "yellow"});
                    manualDps.push({x: firstLap, y: manualLapCount, markerColor: "yellow", indexLabel: "M"});
                }
            })
            .then(function () {
                return that.Laps.getLaps(dateToCheck);
            })
            .then(function (results) {
                for (var i = 0; i < results.length; i++) {
                    var object = results[i];
                    var lapEnd = object.createdAt;
                    var lapStart = new Date(lapEnd - (object.get("length") * 1000));

                    var dp = {x: lapStart, y: length, markerType: "none"};

                    // todo: consolidate points

                    dps.push(dp);
                    length += ((lapEnd - lapStart) / 1000 / 3600);
                    length = Math.ceil(length * 1000) / 1000;
                    dps.push({x: lapEnd, y: length, markerType: "none"});

                    if (setting_show_breaks_on_graphs == true) {
                        if (((lapStart - prevLapEnd) > (1000 * 300))) {
                            dps[dps.length - 3].indexLabel = "SB";
                            dps[dps.length - 3].markerColor = "red";
                            dps[dps.length - 3].markerType = "circle";
                            dps[dps.length - 2].indexLabel = "EB";
                            dps[dps.length - 2].markerColor = "red";
                            dps[dps.length - 2].markerType = "circle";
                        }
                    }
                    var prevLapEnd = lapEnd;
                }

                dps.sort(function (a, b) {
                    a = new Date(a.x);
                    b = new Date(b.x);
                    return a > b ? -1 : a < b ? 1 : 0;
                });
            }).then(function () {
                return that.Goals.isDailyGoalSet(dateToCheck)
            })
            .then(function (value) {
                if (dps.length > 0 && value) {
                    var goal = value.get("goal") / 3600;
                    goalDps.push({x: dps[0].x, y: goal});
                    goalDps.push({x: dps[dps.length - 1].x, y: goal});
                }
            })
            .then(function () {

                var chart = new CanvasJS.Chart("chart_today_chart",
                    {
                        backgroundColor: "#f8f8f8",
                        height: 290,
                        width: chartWidth,
                        title: {
                        },
                        axisX: {
                            valueFormatString: "HH:mm",
                            /* interval:1,
                             intervalType:"hour"*/
                        },
                        axisY: {
                            includeZero: false,
                            gridColor: "#f8f8f8",
                            //valueFormatString: " "

                        },
                        data: [
                            {
                                type: "line",
                                color: "#ea3955",
                                dataPoints: dps
                            },
                            {
                                type: "line",
                                color: "#EAB608",
                                dataPoints: manualDps
                            },
                            {
                                type: "line",
                                color: "#00CE72",
                                dataPoints: goalDps
                            }
                        ]
                    });

                if (dps.length > 0) {
                    chart.render();
                }
                else {
                    $('#chart_today_chart').text("No data");
                }
                toggleLoading('#chart_caption');
                promise.resolve();
            }
        );

        return promise.promise();
    },
    weeklyChart: function (date) {

        var dps = [];
        var totalDps = [];
        var goalDps = [];
        var firstLap;
        var length = 0;
        var promise = $.Deferred();
        var totalCount = 0;

        $('#chart_week_chart').text("");
        var dateToCheck = date ? date : that.Utils.Date.getShortDate();
        toggleLoading('#chart_caption');
        var start = that.Utils.Date.findFirstDateInTheWeek(dateToCheck);
        var end = that.Utils.Date.findLastDateInWeek(dateToCheck);
        that.Laps.getLapTotalGroupedByDay(start, end).then(function (result) {

            result.sort(function (a, b) {
                a = new Date(a.date);
                b = new Date(b.date);
                return a < b ? -1 : a > b ? 1 : 0;
            });

            for (var i = 0; i < result.length; i++) {
                var obj = result[i];
                dps.push({x: obj.date, y: that.Utils.Math.convertToOneDecimalPointNumber(obj.length / 3600), markerType: "none"});
                totalCount += (obj.length / 3600);
                totalDps.push({x: obj.date, y: totalCount, markerType: "none"});
            }

            that.Goals.isWeeklyGoalSet(start).then(function (value) {
                if (dps.length > 0 && value) {
                    var goal = value.get("goal") / 3600;

                    goalDps.push({x: dps[0].x, y: goal, markerType: "none"});
                    goalDps.push({x: dps[dps.length - 1].x, y: goal, markerType: "none"});
                }
            }).then(function () {
                    var chartx = new CanvasJS.Chart("chart_week_chart",
                        {
                            backgroundColor: "#f8f8f8",

                            height: 290,
                            width: chartWidth,
                            title: {
                            },
                            axisX: {
                                valueFormatString: "DDD",

                            },
                            axisY: {
                                includeZero: false,
                                gridColor: "#f8f8f8",
                                //valueFormatString: " "

                            },
                            data: [
                                {
                                    //   color: "#ea3955",
                                    click: function (e) {
                                        var date = e.dataPoint.x;
                                        $('#date_picker_day_button').click();
                                        that.DatePicker.setDayDate(date,0);
                                        //that.DatePicker.weekPress()
                                    },
                                    indexLabel: "{y}",
                                    dataPoints: dps
                                },
                                /*{
                                 type: "line",
                                 dataPoints: totalDps
                                 },
                                 {
                                 type: "line",
                                 color: "green",
                                 dataPoints: goalDps
                                 }*/
                            ]
                        });

                    if (dps.length > 0 && totalCount > 0) {
                        chartx.render();
                    }
                    else {
                        $('#chart_week_chart').text("No data");
                    }
                    toggleLoading('#chart_caption');
                    promise.resolve();
                });

        });


        /*
         // TODO: handle a case when there's no first lap!!!
         that.Laps.findFirstLapInDay(start, end)  // Get the first lap (use it as the manual lap start time)
         .then(function (result) {
         if (result) {
         firstLap = result;
         }
         ;
         })
         .then(function () {
         return that.Laps.getManualLapTotalLength(start, end);  // Get total manual lap time
         })
         .then(function (result) {
         manualLapCount = result;
         if (manualLapCount > 0) {
         length = manualLapCount;
         if (firstLap) {
         manualDps.push({x: firstLap, y: 0, markerColor: "yellow"});
         manualDps.push({x: firstLap, y: manualLapCount, markerColor: "yellow", indexLabel: "M"});
         }
         }
         })
         .then(function () {
         return that.Laps.getLaps(start, end);
         })
         .then(function (results) {
         for (var i = 0; i < results.length; i++) {
         var object = results[i];
         var lapEnd = object.createdAt;
         var lapStart = new Date(lapEnd - (object.get("length") * 1000));

         var dp = {x: lapStart, y: length, markerType: "none"};

         // todo: consolidate points

         dps.push(dp);
         length += ((lapEnd - lapStart) / 1000 / 3600);
         length = Math.ceil(length * 1000) / 1000;
         dps.push({x: lapEnd, y: length, markerType: "none"});

         if (setting_show_breaks_on_graphs == true) {
         if (((lapStart - prevLapEnd) > (1000 * 300))) {
         dps[dps.length - 3].indexLabel = "SB";
         dps[dps.length - 3].markerColor = "red";
         dps[dps.length - 3].markerType = "circle";
         dps[dps.length - 2].indexLabel = "EB";
         dps[dps.length - 2].markerColor = "red";
         dps[dps.length - 2].markerType = "circle";
         }
         }
         var prevLapEnd = lapEnd;
         }

         dps.sort(function (a, b) {
         a = new Date(a.x);
         b = new Date(b.x);
         return a > b ? -1 : a < b ? 1 : 0;
         });
         }).then(function () {
         return that.Goals.isWeeklyGoalSet(start);
         })
         .then(function (value) {
         if (dps.length > 0 && value) {
         var goal = value.get("goal") / 3600;

         goalDps.push({x: dps[0].x, y: goal});
         goalDps.push({x: dps[dps.length - 1].x, y: goal});
         }
         })
         .then(function () {

         var chartx = new CanvasJS.Chart("chart_week_chart",
         {
         backgroundColor: "#f8f8f8",
         zoomEnabled: true,
         height: 290,
         //                    width: 650,
         title: {
         },
         axisX: {
         valueFormatString: "DDD",
         interval: 1,
         intervalType: "day",
         },
         axisY: {
         includeZero: false,
         gridColor: "#f8f8f8",
         //valueFormatString: " "

         },
         data: [
         {

         color: "#ea3955",
         dataPoints: dps
         },
         {
         type: "line",
         color: "#EAB608",
         dataPoints: manualDps
         },
         {
         type: "line",
         color: "#00CE72",
         dataPoints: goalDps
         }
         ]
         });


         if (dps.length > 0) {
         chartx.render();
         }
         else {
         $('#chart_week_chart').text("No data");
         }
         toggleLoading('#chart_week_chart_overlay', true);
         promise.resolve();
         }
         );*/
        return promise.promise();
    },
    monthlyChart: function (date) {

        var dps = [];
        var totalDps = [];
        var goalDps = [];
        var firstLap;
        var length = 0;
        var promise = $.Deferred();
        var totalCount = 0;
        $('#chart_month_chart').text("");
        var dateToCheck = date ? date : that.Utils.Date.getShortDate();
        toggleLoading('#chart_caption');

        var start = that.Utils.Date.findFirstWeekdayInMonth(dateToCheck);
        var end = that.Utils.Date.findLastWeekdayInMonth(dateToCheck);
        that.Laps.getLapTotalGroupedByWeek(start,end).then(function (result) {
            dps = result;

            var chartx = new CanvasJS.Chart("chart_month_chart",
                {
                    backgroundColor: "#f8f8f8",

                    height: 290,
                    width: chartWidth,
                    title: {
                    },
                    axisX: {
                        valueFormatString: "DD/MM",
                        interval: 1,
                        intervalType: "week",
                    },
                    axisY: {
                        includeZero: false,
                        gridColor: "#f8f8f8",
                        minimum: 0
                        //valueFormatString: " "

                    },
                    data: [
                        {
                            //   color: "#ea3955",
                            click: function (e) {
                                var date = e.dataPoint.x;
                                $('#date_picker_week_button').click();
                                that.DatePicker.setWeekDate(date,0);
                                //that.DatePicker.weekPress()
                            },
                            indexLabel: "{y}",
                            dataPoints: dps
                        }
                    ]
                });

            if (dps.length > 0) {
                chartx.render();
            }
            else {
                $('#chart_month_chart').text("No data");
            }
            toggleLoading('#chart_caption');
        });

        return promise.promise();
    },
    totalChart: function (date) {

        var dps = [];
        var totalDps = [];
        var goalDps = [];
        var firstLap;
        var length = 0;
        var promise = $.Deferred();
        var totalCount = 0;
        $('#chart_total_chart').text("");
        var dateToCheck = date ? date : that.Utils.Date.getShortDate();
        toggleLoading('#chart_caption');
        that.Laps.findFirstLapInProject().then(function(value){
            if (value!=false){
                var start = that.Utils.Date.findFirstDateInTheWeek(value);
                start.setHours(0);
                start.setMinutes(0);
                var end = new Date();
                end = that.Utils.Date.findLastWeekdayInMonth(end);
                end = that.Utils.Date.getEndOfDayDate(end);
                console.log(start,end);
                that.Laps.getLapTotalGroupedByWeek(start,end).then(function (result) {

                    dps = result;

                    var chartx = new CanvasJS.Chart("chart_total_chart",
                        {
                            backgroundColor: "#f8f8f8",

                            height: 290,
                            width: chartWidth,
                            title: {
                            },
                            axisX: {
                                valueFormatString: "DD/MM",
                                interval: 1,
                                intervalType: "week",
                            },
                            axisY: {
                                includeZero: false,
                                gridColor: "#f8f8f8",
                                minimum: 0
                                //valueFormatString: " "

                            },
                            data: [
                                {
                                    //   color: "#ea3955",
                                    click: function (e) {
                                        var date = e.dataPoint.x;
                                        date.setHours(0);
                                        date.setMinutes(0);
                                        console.log(date);
                                        $('#date_picker_week_button').click();
                                        that.DatePicker.setWeekDate(date,0);
                                    },
                                    indexLabel: "{y}",
                                    dataPoints: dps
                                }
                            ]
                        });

                    if (dps.length > 0) {
                        chartx.render();
                    }
                    else {
                        $('#chart_total_chart').text("No data");
                    }
                    toggleLoading('#chart_caption');
                    promise.resolve();
                });
            }
            else{
                toggleLoading('#chart_caption');
                promise.resolve();
            }
        });

        return promise.promise();
    }
}
that.Constants = {
    Parse: {
        WEEKLY_GOAL_TYPE: "WEEKLY",
        MONTHLY_GOAL_TYPE: "MONTHLY",
        DAILY_GOAL_TYPE: "DAILY",
        STATE_ENABLED: 1,
        STATE_DISABLED: 2,
        LOG_ADD_ICON: 1,
        LOG_BREAK_ICON: 2,
        LOG_MISC_ICON: 3,
        INFINITY_START:new Date('01/01/1970'),
        INFINITY_END:new Date('01/01/2100')
    },
    General: {
        ENTER_KEYCODE: 13,
        CLICK_TIMEOUT: 500,
        HOUR: 3600,
        MILLISECONDS: 1000,
        UPDATE_INTERVAL: 100,

    },
    Session:{
        DAILY:"DAY",
        WEEKLY:"WEEK",
        MONTHLY:"MONTH",
        TOTAL:"TOTAL"
    },
    Cookies: {
        COOKIE_CURRENT_LAP: "currentLap",
        COOKIE_CURRENT_PROJECT: "currentProjectId",
        COOKIE_CURRENT_PROJECT_TITLE: "currentProjectTitle"
    }
};
that.CookieHandler = {
    createCookie: function (name, value) {
        var exdays = 365;
        var exdate = new Date();
        exdate.setDate(exdate.getDate() + exdays);
        value = escape(value) + ((exdays == null) ? "" : "; expires=" + exdate.toUTCString());
        document.cookie = name + "=" + value;
    },
    readCookie: function (name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    },
    eraseCookie: function (name) {
        this.createCookie(name, "", -1);
    }
}
that.Dashboard = {
    updateDailyDashboard: function (date) {

        that.Dashboard.clearDashboardData('#dashboard_day');
        var today = date ? new Date(date) : new Date(that.Utils.Date.getShortDate());
        if (that.Utils.Date.dateDiff(new Date(that.Utils.Date.getShortDate()), today) == 0) {
            $('#dashboard_day_best_possible_time').show();
        }
        else {
            $('#dashboard_day_best_possible_time').hide();
        }
        var todayEnd = that.Utils.Date.getEndOfDayDate(today);
        toggleLoading('#dashboard_caption');
        that.Goals.isDailyGoalSet(today).then(function () {
            that.Laps.getTotalLapLengthByDate(today, todayEnd).then(function (result) {
                that.Dashboard.updateDashboardData(result.length, '#dashboard_day')
            });
        });
    },
    updateWeeklyDashboard: function (date) {
        that.Dashboard.clearDashboardData('#dashboard_week');
        var first = date ? new Date(date) : new Date(that.Utils.Date.getShortDate());
        first = that.Utils.Date.findFirstDateInTheWeek(first);
        var last = that.Utils.Date.findLastDateInWeek(first)
        last = that.Utils.Date.getEndOfDayDate(last);
        toggleLoading('#dashboard_caption');
        that.Goals.isWeeklyGoalSet(first).then(function () {
            that.Laps.getTotalLapLengthByDate(first, last).then(function (result) {

                that.Dashboard.updateDashboardData(result.length, '#dashboard_week')
            });
        });
    },
    updateMonthlyDashboard: function (date) {
        that.Dashboard.clearDashboardData('#dashboard_month');
        var first = date ? new Date(date) : new Date(that.Utils.Date.getShortDate());
        var first = that.Utils.Date.findFirstDateInMonth(first);
        var firstWeekDay = that.Utils.Date.findFirstWeekdayInMonth(first);
        //var last = that.Utils.Date.findLastDateInMonth(first)
        var last = that.Utils.Date.findLastWeekdayInMonth(first);
        last = that.Utils.Date.getEndOfDayDate(last);
        toggleLoading('#dashboard_caption');
        that.Goals.isMonthlyGoalSet(first).then(function () {
            that.Laps.getTotalLapLengthByDate(firstWeekDay, last).then(function (result) {
                that.Dashboard.updateDashboardData(result.length, '#dashboard_month')
            });
        });
    },
    updateTotalDashboard: function (date) {
        that.Dashboard.clearDashboardData('#dashboard_total');
        toggleLoading('#dashboard_caption');
        that.Laps.getTotalLapLengthByDate(that.Constants.Parse.INFINITY_START,that.Constants.Parse.INFINITY_END).then(function (result) {
             that.Dashboard.updateDashboardData(result.length, '#dashboard_total')
        });
    },
    clearDashboardData:function(dashboardJQueryElement){

        $(dashboardJQueryElement + "_hours").removeClass('completed');
        $(dashboardJQueryElement + "_percentage").removeClass('completed');
        $(dashboardJQueryElement + "_hours").text("0");
        $(dashboardJQueryElement + "_time").text("00:00:00");
        $(dashboardJQueryElement + "_goal").text("00:00");
        $(dashboardJQueryElement + "_percentage").text("0%");
        if ($(dashboardJQueryElement + "_best_possible_time").length) {
            $(dashboardJQueryElement + "_best_possible_time").text("00:00");
        }
        $(dashboardJQueryElement + "_left").text("00:00");
    },
    updateDashboard: function () {
        that.Dashboard.updateDailyDashboard();
        that.Dashboard.updateWeeklyDashboard();
        that.Dashboard.updateMonthlyDashboard();
        that.Dashboard.updateTotalDashboard();
    },
    updateDashboardData: function (totalLapLength, dashboardJQueryElement) {

        var goal = that.Utils.Time.timeStringToSeconds($(dashboardJQueryElement + "_goal").text());
        var percentageCompleted = that.Utils.Math.percentageOfDivision(totalLapLength, goal);
        $(dashboardJQueryElement + "_hours").removeClass('completed');
        $(dashboardJQueryElement + "_percentage").removeClass('completed');
        $(dashboardJQueryElement + "_hours").text(that.Utils.Time.convertSecondsToHours(totalLapLength));
        $(dashboardJQueryElement + "_time").text(that.Utils.Time.secondsToString(totalLapLength));
        $(dashboardJQueryElement + "_percentage").text(percentageCompleted + "%");

        if (percentageCompleted >= 100) {
            $(dashboardJQueryElement + "_hours").addClass('completed');
            $(dashboardJQueryElement + "_percentage").addClass('completed');
        }

        var goalLeft = goal - totalLapLength;


        var bestPossibleTime = new Date();
        bestPossibleTime.setTime((goalLeft * that.Constants.General.MILLISECONDS) + bestPossibleTime.getTime());
        bestPossibleTime = goalLeft > 0 ? that.Utils.Time.convertDateToHHMMString(bestPossibleTime) : "N/A";

        goalLeft = goalLeft > 0 ? that.Utils.Time.secondsToString(goalLeft).substr(0, 5) : "N/A";
        if ($(dashboardJQueryElement + "_best_possible_time").length) {
            $(dashboardJQueryElement + "_best_possible_time").text(bestPossibleTime);
        }
        $(dashboardJQueryElement + "_left").text(goalLeft);

        toggleLoading("#dashboard_caption");
    }

}
that.DatePicker = {

    jQuery: function () {
        $('#date_picker_today_back_button').click(this.dayPressBack);
        $('#date_picker_today_forward_button').click(this.dayPressForward);
        $('#date_picker_week_back_button').click(this.weekPressBack);
        $('#date_picker_week_forward_button').click(this.weekPressForward);
        $('#date_picker_month_back_button').click(this.monthPressBack);
        $('#date_picker_month_forward_button').click(this.monthPressForward);
        $(".day_week_month_button").click(this.datePickerButtonPress);
    },
    datePickerButtonPress: function () {

        $(this).siblings().removeClass('day_week_month_button_selected');
        $(this).addClass('day_week_month_button_selected');

        var id = $(this)[0].id
        var classToHide = id.split("_")[2];
        $("." + classToHide).show().siblings().hide();

        id = id.replace("_button", "");
        id = "#" + id;
        $(id).show().siblings().hide();

        that.Session.currentView = classToHide.toUpperCase();
    },
    dayPressBack: function () {
        that.DatePicker.dayPress(-1);
    },
    dayPressForward: function () {
        that.DatePicker.dayPress(1);
    },
    dayPress: function (val) {
        clearTimeout(timeOut);
        var date = new Date($('#date_picker_today_date').text());
        date.setDate(date.getDate() + val);
        that.DatePicker.setDayDate(date);
    },
    setDayDate: function (date,timeoutInterval) {
        date = that.Utils.Date.getShortDate(date);
        timeoutInterval=timeoutInterval==undefined?that.Constants.General.CLICK_TIMEOUT:timeoutInterval;
        $('#date_picker_today_date').text(date);
        timeOut = setTimeout(function () {
            that.Chart.dailyChart(date);
            that.Dashboard.updateDailyDashboard(date);
            $('#dashboard_day').show().siblings().hide();
            $('#chart_today').show().siblings().hide();
        }, timeoutInterval);
    },
    weekPressBack: function () {
        that.DatePicker.weekPress(-7);
    },
    weekPressForward: function () {
        that.DatePicker.weekPress(7);
    },
    weekPress: function (val) {
        clearTimeout(timeOut);
        var date = new Date($('#date_picker_week_date').text().substr(0, 10));
        date.setDate(date.getDate() + val);
        that.DatePicker.setWeekDate(date);

    },
    setWeekDate: function (date,timeoutInterval) {
        var first = that.Utils.Date.findFirstDateInTheWeek(date);
        var last = that.Utils.Date.findLastDateInWeek(first);
        timeoutInterval=timeoutInterval==undefined?that.Constants.General.CLICK_TIMEOUT:timeoutInterval;
        $('#date_picker_week_date').text(that.Utils.Date.getShortDate(first) + " - " + that.Utils.Date.getShortDate(last));
        timeOut = setTimeout(function () {
            that.Chart.weeklyChart(first);
            that.Dashboard.updateWeeklyDashboard(first);
            $('#dashboard_week').show().siblings().hide();
            $('#chart_week').show().siblings().hide();
        }, timeoutInterval);
    },
    monthPressBack: function () {
        var date = new Date($('#date_picker_month_date').text().substr(0, 10));
        date.setDate(date.getDate() - 1);
        var dateForCaption = new Date(date);
        dateForCaption.setDate(dateForCaption.getDate()-15);
        $('#date_picker_month_caption').text(that.Utils.Date.monthNames[dateForCaption.getMonth()]+" "+dateForCaption.getFullYear());
        var first = that.Utils.Date.findFirstWeekdayInMonth(date);
        var last = that.Utils.Date.findLastWeekdayInMonth(date);
        $('#date_picker_month_date').text(that.Utils.Date.getShortDate(first) + " - " + that.Utils.Date.getShortDate(last));
        that.DatePicker.monthPress(date);
    },
    monthPressForward: function () {
        var date = new Date($('#date_picker_month_date').text().substr(13, 23));
        date.setDate(date.getDate() + 1);
        var dateForCaption = new Date(date);
        dateForCaption.setDate(dateForCaption.getDate()+15);
        $('#date_picker_month_caption').text(that.Utils.Date.monthNames[dateForCaption.getMonth()]+" "+dateForCaption.getFullYear());
        var first = that.Utils.Date.findFirstWeekdayInMonth(date);
        var last = that.Utils.Date.findLastWeekdayInMonth(date);
        $('#date_picker_month_date').text(that.Utils.Date.getShortDate(first) + " - " + that.Utils.Date.getShortDate(last));
        that.DatePicker.monthPress(date);
    },
    monthPress: function (date,timeoutInterval) {
        clearTimeout(timeOut);
        timeoutInterval=timeoutInterval==undefined?that.Constants.General.CLICK_TIMEOUT:timeoutInterval;
        timeOut = setTimeout(function () {
            that.Chart.monthlyChart(date);
            that.Dashboard.updateMonthlyDashboard(date);
            $('#dashboard_month').show().siblings().hide();
            $('#chart_month').show().siblings().hide();
        }, timeoutInterval);
    }
};
that.Facebook = {
    init: function () {
        var promise = $.Deferred();
        $.ajaxSetup({ cache: true });
        $.getScript('//connect.facebook.net/en_UK/all.js', function () {
            Parse.FacebookUtils.init({
                appId: '801581419859259', // Facebook App ID
                status: false, // check login status
                cookie: true, // enable cookies to allow Parse to access the session
                xfbml: true  // parse XFBML
            });

            FB.getLoginStatus(function (response) {
                /* if (response.status === 'connected') {
                 var uid = response.authResponse.userID;
                 var accessToken = response.authResponse.accessToken;

                 } else if (response.status === 'not_authorized') {
                 // the user is logged in to Facebook,
                 // but has not authenticated your app
                 } else {
                 // the user isn't logged in to Facebook.
                 }*/
                that.Session.facebookLogin = true;
                if (response.status !== 'connected' || Parse.User.current() == null) {
                    Parse.FacebookUtils.logIn(null, {
                        success: function (user) {
                            // can check here if user.existed()
                            console.log("User logged in through Facebook!");
                            that.Facebook.getFullName().then(function (name) {
                                that.Session.userFullName = name;
                                promise.resolve()
                            });
                        },
                        error: function (user, error) {
                            console.log("User cancelled the Facebook login or did not fully authorize.");
                        }
                    });
                }
                else {
                    that.Facebook.getFullName().then(function (name) {
                        that.Session.userFullName = name;
                        promise.resolve()
                    });
                }
            });
        });

        return promise.promise();
    },
    postToFacebook: function () {

        var description,length,goal;
        switch (that.Session.currentView){
            case that.Constants.Session.DAILY:
                description='I worked for ' + $('#dashboard_day_hours').text() + ' hours today ' +
                    'on my ' + $('#project_title').text() + ' project ';
                    if ($('#dashboard_day_percentage').text() != "0%"){
                    description+='and reached ' + $('#dashboard_day_percentage').text() + ' of my goal!'
                    }
                break;
            case that.Constants.Session.WEEKLY:
                description='I worked for ' + $('#dashboard_week_hours').text() + ' hours this week ' +
                    'on my ' + $('#project_title').text() + ' project ';
                if ($('#dashboard_week_percentage').text() != "0%"){
                    description+='and reached ' + $('#dashboard_week_percentage').text() + ' of my goal!'
                }
                break;
            case that.Constants.Session.MONTHLY:
                description='I worked for ' + $('#dashboard_month_hours').text() + ' hours this month ' +
                    'on my ' + $('#project_title').text() + ' project ';
                if ($('#dashboard_month_percentage').text() != "0%"){
                    description+='and reached ' + $('#dashboard_month_percentage').text() + ' of my goal!'
                }
                break;
            case that.Constants.Session.TOTAL:
                description='I worked for ' + $('#dashboard_total_hours').text() + ' hours ' +
                    'on my ' + $('#project_title').text() + ' project already!';
                break;
        }

        FB.ui(
            {
                method: 'feed',
                name: 'NetTime',
                caption: 'Look what I achieved!',
                description: description,
                link: 'http://shaharyakir.github.io/',
                picture: 'http://shaharyakir.github.io/images/logo.png'
            },
            function (response) {
                if (response && response.post_id) {
                    console.log('Post was published.');
                } else {
                    console.log('Post was not published.');
                }
            }
        );
    },
    getFullName: function () {
        var promise = $.Deferred();
        FB.api(
            "/me?fields=name",
            function (response) {
                // console.log(response);
                if (response && !response.error) {
                    promise.resolve(response.name);
                }
            }
        );
        return promise.promise();
    }
}
that.Goals = {
    isAllGoalsSet: function () {
        var promise = $.Deferred();
        var answer = new Boolean(true);
        that.Goals.isDailyGoalSet()
            .then(function (value) {

                answer = answer && (value != undefined);

            })
            .then(that.Goals.isWeeklyGoalSet()
                .then(function (value) {
                    answer = answer && (value != undefined);
                }))
            .then(that.Goals.isMonthlyGoalSet()
                .then(function (value) {
                    answer = answer && (value != undefined);
                    promise.resolve(answer);
                }));
        return promise;
    },
    getGoalTime: function (value) {
        return that.Utils.Time.secondsToString(value).substr(0, 5);
    },
    isGoalSet: function (date, type) {
        var promise = $.Deferred();
        var date = that.Utils.Date.getShortDate(new Date(date));
        var parseGoal = Parse.Object.extend("Goals");
        var query = new Parse.Query(parseGoal);
        query.equalTo("date", date);
        query.equalTo("type", type);
        query.equalTo("project", currentProject)

        query.first().then(function (result) {
            promise.resolve(result);
        });
        return promise.promise();
    },
    setGoal: function (date, type, length) {
        var parseGoal = Parse.Object.extend("Goals");
        var parseGoalRecord;

        var promise = $.Deferred();

        $.when(that.Goals.isGoalSet(date, type).done(function (value) {
            if (value) {
                parseGoalRecord = value;
                parseGoalRecord.set("goal", length);
            }
            else {
                parseGoalRecord = new parseGoal();
                parseGoalRecord.set("date", date);
                parseGoalRecord.set("goal", length);
                parseGoalRecord.set("type", type);
            }
            parseGoalRecord.set("project", currentProject);
            parseGoalRecord.save().then(function () {
                promise.resolve();
                that.Session.updateAllObjects();
            });
        }));

        return promise.promise();
    },
    setDailyGoal: function () {
        var goal = that.Utils.Time.timeStringToSeconds($("#goal_time_to_set_day").text());
        var date = that.Utils.Date.getShortDate();
        that.Goals.setGoal(date, that.Constants.Parse.DAILY_GOAL_TYPE, goal).then(function () {
            $("#set_daily_goal_section").hide();
        });
    },
    isDailyGoalSet: function (date) {
        var promise = $.Deferred();
        date = date ? date : that.Utils.Date.getShortDate();


        that.Goals.isGoalSet(date, that.Constants.Parse.DAILY_GOAL_TYPE).then(function (value) {
            if (!value) {
                $("#set_daily_goal_section").show();
                $("#dashboard_day_goal").text("N/A");
            }
            else {
                $("#dashboard_day_goal").text(that.Goals.getGoalTime(value.get("goal")));
                $("#goal_time_to_set_day").text(that.Goals.getGoalTime(value.get("goal")));
                $("#dailyGoalSlider").slider("value", value.get("goal"));
            }
            promise.resolve(value);
        });

        return promise.promise();
    },
    setWeeklyGoal: function () {
        var goal = that.Utils.Time.timeStringToSeconds($("#goal_time_to_set_week").text());
        var date = that.Utils.Date.getShortDate(that.Utils.Date.findFirstDateInTheWeek(that.Utils.Date.getShortDate()));
        that.Goals.setGoal(date, that.Constants.Parse.WEEKLY_GOAL_TYPE, goal).then(function () {
            $("#set_weekly_goal_section").hide();
        });
    },
    isWeeklyGoalSet: function (date) {
        var promise = $.Deferred();
        date = date ? that.Utils.Date.getShortDate(date) : that.Utils.Date.getShortDate(that.Utils.Date.findFirstDateInTheWeek(that.Utils.Date.getShortDate()));

        $.when(that.Goals.isGoalSet(date, that.Constants.Parse.WEEKLY_GOAL_TYPE).done(function (value) {

            if (!value) {
                $("#set_weekly_goal_section").show();
                $("#dashboard_week_goal").text("N/A");
            }
            else {
                $("#dashboard_week_goal").text(that.Goals.getGoalTime(value.get("goal")));
                $("#goal_time_to_set_week").text(that.Goals.getGoalTime(value.get("goal")));
                $("#weeklyGoalSlider").slider("value", value.get("goal"));
            }
            promise.resolve(value);
        }));

        return promise.promise();
    },
    setMonthlyGoal: function () {
        var goal = that.Utils.Time.timeStringToSeconds($("#goal_time_to_set_month").text());
        var date = that.Utils.Date.getShortDate(that.Utils.Date.findFirstDateInMonth(that.Utils.Date.getShortDate()));
        that.Goals.setGoal(date, that.Constants.Parse.MONTHLY_GOAL_TYPE, goal).then(function () {
            $("#set_monthly_goal_section").hide();
        });
    },
    isMonthlyGoalSet: function (date) {
        var promise = $.Deferred();
        date = date ? that.Utils.Date.getShortDate(date) : that.Utils.Date.getShortDate(that.Utils.Date.findFirstDateInMonth(that.Utils.Date.getShortDate()));
        $.when(that.Goals.isGoalSet(date, that.Constants.Parse.MONTHLY_GOAL_TYPE).done(function (value) {
            if (!value) {
                $("#set_monthly_goal_section").show();
                $("#dashboard_month_goal").text("N/A");
            }
            else {
                $("#dashboard_month_goal").text(that.Goals.getGoalTime(value.get("goal")));
                $("#goal_time_to_set_month").text(that.Goals.getGoalTime(value.get("goal")));
                $("#monthlyGoalSlider").slider("value", value.get("goal"));
            }
            promise.resolve(value);
        }));

        return promise.promise();
    }
}
that.Laps = {
    saveLap: function (value, jqueryPressedElement, callback, isManual) {

        if (value > 0) {
            toggleLoading(jqueryPressedElement);
            var TestObject = Parse.Object.extend("Laps");
            var testObject = new TestObject();
            isManual = isManual ? isManual : false;
            testObject.save({length: value, date: that.Utils.Date.getShortDate(), isManualLap: isManual, project: currentProject}).then(function () {
                toggleLoading(jqueryPressedElement);
                that.Session.updateAllObjects();
                if (callback) {
                    callback()
                }
                ;
            });
        }
    },
    getLaps: function (startDate, endDate) {
        var promise = $.Deferred();
        var Laps = Parse.Object.extend("Laps");
        var query = new Parse.Query(Laps);

        if (endDate === undefined || endDate === startDate) {
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);
        }


        query.greaterThanOrEqualTo("createdAt", new Date(startDate));
        query.lessThanOrEqualTo("createdAt", new Date(endDate));
        query.limit(1000);
        query.equalTo("project", currentProject);
        //query.equalTo("date", "01/12/2014");
        query.notEqualTo("isManualLap", true);
        query.ascending("createdAt");
        query.find().then(function (results) {
            promise.resolve(results);
        });
        return promise.promise();
    },
    findFirstLapInDay: function (startDate, endDate) {
        var promise = $.Deferred();
        var Laps = Parse.Object.extend("Laps");
        var query = new Parse.Query(Laps);
        if (endDate === undefined || endDate === startDate) {
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);
        }
        query.greaterThanOrEqualTo("createdAt", new Date(startDate));
        query.lessThanOrEqualTo("createdAt", new Date(endDate));
        query.limit(1000);
        query.notEqualTo("isManualLap", true);
        query.equalTo("project", currentProject);
        query.ascending("createdAt");
        query.first().then(function (result) {
            var val = result ? (result.createdAt - (result.get("length") * that.Constants.General.MILLISECONDS)) : undefined;
            promise.resolve(val);
        });

        return promise.promise();
    },
    findFirstLapInProject: function(){
        var promise = $.Deferred();
        var Laps = Parse.Object.extend("Laps");
        var query = new Parse.Query(Laps);
        query.equalTo("project", currentProject);
        query.ascending("createdAt");
        query.first().then(function (result) {
            var retVal=false;
            if (result && result.createdAt){retVal=result.createdAt;}
            promise.resolve(retVal);
        });

        return promise.promise();
    },
    getManualLapTotalLength: function (startDate, endDate) {
        var promise = $.Deferred();
        var Laps = Parse.Object.extend("Laps");
        var query = new Parse.Query(Laps);
        var val = 0;
        if (endDate === undefined || endDate === startDate) {
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);
        }

        query.greaterThanOrEqualTo("createdAt", new Date(startDate));
        query.lessThanOrEqualTo("createdAt", new Date(endDate));
        query.limit(1000);
        query.equalTo("isManualLap", true);
        query.equalTo("project", currentProject);
        query.find().then(function (results) {
            if (results) {
                for (var i = 0; i < results.length; i++) {
                    val += results[i].get("length");
                }
            }
            promise.resolve(val / 3600);
        });

        return promise.promise();
    },
    getTotalDayLapLength: function (day) {
        var startDate = day;
        var endDate = that.Utils.Date.getEndOfDayDate(day);
        return this.getTotalLapLengthByDate(startDate, endDate);
    },
    getTotalLapLengthByDate: function (startDate, endDate,isProject) {

        var promise = $.Deferred();
        startDate.setHours(0);
        startDate.setMinutes(0);
        var result = {};
        result.startDate = new Date(startDate);
        result.endDate = new Date(endDate);

        if (endDate === undefined || endDate === startDate) {
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);
        }
        ;

        var Laps = Parse.Object.extend("Laps");
        var query = new Parse.Query(Laps);

        query.greaterThanOrEqualTo("createdAt", startDate);
        query.lessThanOrEqualTo("createdAt", endDate);

        if (isProject==false){
            var Projects = Parse.Object.extend("Projects");
            var innerQuery = new Parse.Query(Projects);
            innerQuery.equalTo("user",Parse.User.current());
            query.matchesQuery("project",innerQuery);
        }
        else{
            query.equalTo("project", currentProject);
        }
        query.limit(1000);

        query.find().then(function (results) {
            var totalLength = 0;


            for (var i = 0; i < results.length; i++) {
                var object = results[i];
                totalLength += parseInt(object.get('length'));
            }

            result.length = totalLength;
            promise.resolve(result);
        });

        return promise.promise();
    },
    getLapTotalGroupedByDay: function (startDate, endDate) {
        var promise = $.Deferred();
        var count = that.Utils.Date.dateDiff(endDate, startDate);
        var asyncCount = count;
        var dateToCheck = new Date(endDate);
        var result = [];

        for (var i = count; count >= 0; count--) {
            var data = {};
            data.date = new Date(dateToCheck);
            result.push(data);
            dateToCheck.setDate(dateToCheck.getDate() - 1);
        }
        dateToCheck = new Date(endDate);
        count = that.Utils.Date.dateDiff(endDate, startDate);
        for (var i = count; count >= 0; count--) {
            that.Laps.getTotalDayLapLength(dateToCheck).then(function (obj) {

                for (var j = 0; j < result.length; j++) {
                    if (that.Utils.Date.dateDiff(result[j].date, obj.startDate) == 0) {
                        result[j].length = obj.length;
                    }
                }

                if (asyncCount == 0) {

                    promise.resolve(result);
                }
                asyncCount--;
            });
            dateToCheck.setDate(dateToCheck.getDate() - 1);
        }

        return promise.promise();
    },
    getLapTotalGroupedByWeek: function (start,end) {
        var promise = $.Deferred();

        that.Laps.getLapTotalGroupedByDay(start, end).then(function (result) {

            result.sort(function (a, b) {
                a = new Date(a.date);
                b = new Date(b.date);
                return a < b ? -1 : a > b ? 1 : 0;
            });

            var weekTotal = 0;
            var dps = [];
            var currentDate = new Date(start);
            while (that.Utils.Date.dateDiff(end, currentDate) >= 0) {
                weekTotal = 0;
                for (var i = 0; i <= 6; i++) {
                    var obj = result.shift();
                    if (obj){
                        weekTotal += obj.length;
                    }
                }
                weekTotal /= that.Constants.General.HOUR;
                weekTotal = that.Utils.Math.convertToOneDecimalPointNumber(weekTotal);
                if (weekTotal > 0) {
                    dps.push({x: new Date(currentDate), y: weekTotal});
                }
                currentDate.setDate(currentDate.getDate() + 7);
            }
            promise.resolve(dps);

        });

        return promise.promise();
    }
}
that.Log = {

    loadLogEntries: function (date) {
        $('#log_table').text(" ");
        var Log = Parse.Object.extend("Logs");
        var query = new Parse.Query(Log);
        date = date ? date : that.Utils.Date.getShortDate();
        toggleLoading('#log_overlay', true);
        query.equalTo("project", currentProject);
        query.equalTo("date", date);
        query.notEqualTo("state", that.Constants.Parse.STATE_DISABLED);
        query.find().then(function (results) {
            toggleLoading('#log_overlay', true);
            for (var i = 0; i < results.length; i++) {
                var object = results[i];
                that.Log.addLogEntry(object);
            }
        });
    },
    addLogEntry: function (parseObject) {

        /*<tr>
         <td>ICON</td>
         <td>11:11</td>
         <td>Added Bla</td>
         </tr>*/

        var element =
            "<tr parseid=''" + parseObject.id + "'>" +
                /* "<td class='log_entry_icon'>"+parseObject.get("type")+"</td>" +*/
                "<td class='log_entry_time'>" + parseObject.get("time") + "</td>" +
                "<td class='log_entry_data'>" + parseObject.get("data") + "</td>"
        "</tr>";

        $('#log_table').append(element);
    }


}
that.Projects = {
    Dashboard:{
        updateDashboardData:function(){
            var today = new Date(that.Utils.Date.getShortDate());
            var todayEnd = that.Utils.Date.getEndOfDayDate(today);
            var firstWeekDay = that.Utils.Date.findFirstDateInTheWeek(today);
            var lastWeekDay = that.Utils.Date.findLastDateInWeek(today);
            lastWeekDay = that.Utils.Date.getEndOfDayDate(lastWeekDay);
            var firstMonthDay = that.Utils.Date.findFirstWeekdayInMonth(today);
            var lastMonthDay = that.Utils.Date.findLastWeekdayInMonth(today);
            lastMonthDay = that.Utils.Date.getEndOfDayDate(lastMonthDay);
            toggleLoading('#project_list_dashboard_day_hours');
            that.Laps.getTotalLapLengthByDate(today,todayEnd,false).then(function(value){
                toggleLoading('#project_list_dashboard_day_hours');
                $('#project_list_dashboard_day_hours').text(that.Utils.Time.convertSecondsToHours(value.length));
            });
            toggleLoading('#project_list_dashboard_week_hours');
            that.Laps.getTotalLapLengthByDate(firstWeekDay,lastWeekDay,false).then(function(value){
                toggleLoading('#project_list_dashboard_week_hours');
                $('#project_list_dashboard_week_hours').text(that.Utils.Time.convertSecondsToHours(value.length));
            });
            toggleLoading('#project_list_dashboard_month_hours');
            that.Laps.getTotalLapLengthByDate(firstMonthDay,lastMonthDay,false).then(function(value){
                toggleLoading('#project_list_dashboard_month_hours');
                $('#project_list_dashboard_month_hours').text(that.Utils.Time.convertSecondsToHours(value.length));
            });
        }
    },
    loadProjects: function () {
        var Projects = Parse.Object.extend("Projects");
        var query = new Parse.Query(Projects);
        /*var username = Parse.User.current().get("username");*/

        that.Projects.Dashboard.updateDashboardData();
        $('#projects_list').text(" ");
        toggleLoading('#projects_list');

        query.equalTo("user", Parse.User.current());
        query.notEqualTo("state", that.Constants.Parse.STATE_DISABLED);
        query.find().then(function (results) {
            toggleLoading('#projects_list');
            for (var i = 0; i < results.length; i++) {
                var object = results[i];
                that.Projects.addProject(object);
            }
        });
    },
    addProject: function (parseObject) {
        var element =
            "<div class='project' parseid='" + parseObject.id + "'>" + parseObject.get("title") +
                "<span class='icon delete_icon' id='delete_icon' style='display:none'></span>" +
                "</div>";
        $('#projects_list').append(element);
    },
    deleteProject: function (parseid) {
        var Projects = Parse.Object.extend("Projects");
        var query = new Parse.Query(Projects);
        query.equalTo("objectId", parseid);
        query.first().then(function (proj) {
            proj.set('state', that.Constants.Parse.STATE_DISABLED);
            proj.save().then(function () {
                $('#projects_list').text("");
                that.Projects.loadProjects();
            });
        });
    },
    onProjectLoad: function (id, title) {
        var Project = Parse.Object.extend("Projects");
        currentProject = new Project();
        currentProject.id = id;
        currentProjectTitle = title;

        $('#projects_container').hide();
        $('#project_title').text(currentProjectTitle);
        $('#settings_icon').show();
        $('#goals_icon').show();
        if (that.Session.facebookLogin === true) {
            $('#facebook_icon').show();
        }
        $('#date_picker_today_date').text(that.Utils.Date.getShortDate());
        $('#log_today_date').text(that.Utils.Date.getShortDate());
        var lastDayOfWeek = new Date(that.Utils.Date.findFirstDateInTheWeek(that.Utils.Date.getShortDate()));
        lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 6);
        $('#date_picker_week_date').text(that.Utils.Date.getShortDate(that.Utils.Date.findFirstDateInTheWeek(that.Utils.Date.getShortDate())) + " - " + that.Utils.Date.getShortDate(lastDayOfWeek));
        $('#date_picker_month_date').text(that.Utils.Date.getShortDate(that.Utils.Date.findFirstWeekdayInMonth(that.Utils.Date.getShortDate())) + " - " + that.Utils.Date.getShortDate(that.Utils.Date.findLastWeekdayInMonth(that.Utils.Date.getShortDate())));
        $('#date_picker_month_caption').text(that.Utils.Date.monthNames[new Date().getMonth()]+" "+new Date().getFullYear());
        $('#date_picker_month_button').click();
        that.Session.loadApplication();

    }
}
that.Session = {
    facebookLogin: false,
    isFacebookUser: false,
    userFullName: undefined,
    currentView:that.Constants.Session.DAILY,
    clear: function () {

        $('#user_log_out_panel').hide();
        $('#projects_list').text("");
        that.CookieHandler.eraseCookie(that.Constants.Cookies.COOKIE_CURRENT_PROJECT);
        that.CookieHandler.eraseCookie(that.Constants.Cookies.COOKIE_CURRENT_PROJECT_TITLE);
        $('#log_table').text("");
        $('#application').hide();
        $('#projects_container').hide();
        $('#settings_icon').hide();
        $('#goals_icon').hide();
        $('#facebook_icon').hide();
        $('#user_panel').hide();
        $('#facebook_login_button').show();
        $('#nettime_login_container').hide();
        $('#back_to_login_with_facebook').parent().hide();
        $('#login_with_nettime').parent().show();

        that.Session.facebookLogin = false;
        Parse.User.logOut();
    },
    updateAllObjects: function () {
        that.Dashboard.updateDashboard();
        that.Goals.isAllGoalsSet().then(function (value) {
            if (value !== true) {
                $('#warning_goals').show();
            }
            else {
                $('#warning_goals').hide();
            }
        });
        that.Chart.renderCharts();
    },
    initParse: function () {
        if (document.title == "Test") {
            Parse.initialize("75yStvvNmep3ZhsC5VAtMBSUGjoECMmmNI7aHxTK", "BZxsbuz6tYffL4Ld09pO5tswvBVrvVLoROezGlpR");
        }
        else {
            Parse.initialize("vnkcS0pKaV0JYhW37n7DI2JPpiAftf5b6WmXM0Kw", "bzqGddUaGZc7cjsp7RxJfsOVMQVFXGCMiKzxbZz5");
        }
    },
    onUserLogin: function () {
        $('#user_login_container').hide();
        $('#projects_container').fadeIn(1000);
        $('#loading').hide();
        toggleLoading('#loading');
        $('#current_user').text(this.userFullName);
        $('#settings_panel').show();
        $('#user_panel').show();

        var projectIdFromCookie = that.CookieHandler.readCookie(that.Constants.Cookies.COOKIE_CURRENT_PROJECT);
        var projectTitleFromCookie = that.CookieHandler.readCookie(that.Constants.Cookies.COOKIE_CURRENT_PROJECT_TITLE);
        var isProjectCached = ((projectIdFromCookie != "") && (projectTitleFromCookie != "") && (projectIdFromCookie != null) && (projectTitleFromCookie != null));
        if (isProjectCached == true) {
            projectTitleFromCookie = decodeURIComponent(projectTitleFromCookie);
            that.Projects.onProjectLoad(projectIdFromCookie, projectTitleFromCookie);
        }
        else {
            that.Projects.loadProjects();
        }
    },
    loadApplication: function () {
        $('#application').fadeIn(1000);
        that.Session.initWidth();
        that.Session.handleScreenSize();
        that.Log.loadLogEntries();
        that.Session.updateAllObjects();
    },
    login: function () {
        if (Parse.User.current() != null) {
            $('#loading').css('display','inline-block').show();
            toggleLoading('#loading');
            that.Session.isFacebookUser = Parse.FacebookUtils.isLinked(Parse.User.current());
            if (!this.isFacebookUser) {
                this.userFullName = Parse.User.current().getUsername();
                this.onUserLogin();
            }
            else {
                that.Facebook.init().then(function () {
                    that.Session.onUserLogin();
                });
            }
        }
    },
    initWidth:function(){
        oldChartWidth = $('#chart_container').width() * 0.9;
        chartWidth = $('#chart_container').width() * 0.9;
    },
    handleScreenSize:function(){

        chartWidth = $('#chart_container').width() * 0.9;
        if (Math.abs(chartWidth-oldChartWidth)>30){
            oldChartWidth = chartWidth
            that.Chart.renderCharts();
        }

        var datePickerButtons = $('.day_week_month_button');
        $(datePickerButtons).removeClass("day_week_month_button_narrow");
        $(".date_picker_caption").removeClass("date_picker_caption_narrow");
        $(".dashboard_details").removeClass("dashboard_details_narrow");


        for (var i = 0; i < datePickerButtons.length; i++) {
            var obj = datePickerButtons[i];
            var text = $(obj).text();
            $(obj).text($(obj).attr("longName"));

        }


        var top,oldTop;
        var shorten=false;
        for (var i = 0; i < datePickerButtons.length; i++) {
            var obj = datePickerButtons[i];
            top=$(obj).position().top;
            if (oldTop==undefined){oldTop=top;}
            if (oldTop!=top){
                shorten=true;
                break;
            }
        }
        if (shorten==true){
            for (var i = 0; i < datePickerButtons.length; i++) {
                var obj = datePickerButtons[i];
                var text = $(obj).text();
                $(obj).text($(obj).attr("shortName"));

            }
            $(datePickerButtons).addClass("day_week_month_button_narrow");
            $(".date_picker_caption").addClass("date_picker_caption_narrow");
            $(".dashboard_details").addClass("dashboard_details_narrow");
        }

    }

}
that.Stopwatch = {
    clocktimer: 0,
    startAt: 0,	// Time of last start / resume. (0 if not running)
    lapTime: 0,	// Time on the clock when last stopped in milliseconds
    now: function () {
        return (new Date()).getTime();
    },
    start: function () {
        this.startAt = this.startAt ? this.startAt : this.now();
    },
    stop: function () {
        // If running, update elapsed time otherwise keep it
        this.lapTime = this.startAt ? this.lapTime + this.now() - this.startAt : this.lapTime;
        this.startAt = 0; // Paused
        this.reset();
        this.update();
    },

    reset: function () {
        this.lapTime = this.startAt = 0;
    },

    time: function () {
        return this.lapTime + (this.startAt ? this.now() - this.startAt : 0);
    },

    setLapTime: function (newLap) {
        this.lapTime = parseInt(newLap);
    },
    update: function () {
        var time = this.time();
        $('#time').text(that.Utils.Time.formatTime(time));
        that.CookieHandler.createCookie(that.Constants.Cookies.COOKIE_CURRENT_LAP, time);
        document.title = "(" + that.Utils.Time.formatTime(time) + ")" + " Running";
    }
}
that.Utils = {

    Time: {
        convertSecondsToHours: function (seconds) {
            seconds = parseInt(seconds);
            return Math.ceil((seconds / 3600) * 10) / 10;
        },
        secondsToString: function (time) {
            var h = m = s = ms = 0;
            var newTime = '';

            h = Math.floor(time / (60 * 60));
            time = time % (60 * 60);
            m = Math.floor(time / (60));
            time = time % (60 );
            s = Math.floor(time);

            newTime = that.Utils.Time.pad(h, 2) + ':' + that.Utils.Time.pad(m, 2) + ':' + that.Utils.Time.pad(s, 2);
            return newTime;
        },
        timeStringToSeconds: function (string) {
            var number;

            var hours = parseInt(string.split(":")[0]);
            var minutes = parseInt(string.split(":")[1]);
            var seconds = parseInt(string.split(":")[2]);
            seconds = seconds || 0;

            number = (hours * 3600) + (minutes * 60) + seconds;

            return parseInt(number);

        },
        convertDateToHHMMString: function (date, offset) {
            // date - a Date object
            // offset - an amount in seconds to subtract or add to the time
            date = offset ? (new Date(date - offset * 1000)) : date;
            var hours = date.getHours() < 10 ? '0' + date.getHours() : date.getHours();
            var minutes = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
            return hours + ":" + minutes;
        },
        pad: function (num, size) {
            var s = "0000" + num;
            return s.substr(s.length - size);
        },
        formatTime: function (time) {
            var h = m = s = ms = 0;
            var newTime = '';

            h = Math.floor(time / (60 * 60 * 1000));
            time = time % (60 * 60 * 1000);
            m = Math.floor(time / (60 * 1000));
            time = time % (60 * 1000);
            s = Math.floor(time / 1000);

            newTime = that.Utils.Time.pad(h, 2) + ':' + that.Utils.Time.pad(m, 2) + ':' + that.Utils.Time.pad(s, 2);
            return newTime;
        }

    },
    Date: {
        monthNames:[ "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sept", "Oct", "Nov", "Dec" ],
        getEndOfDayDate: function (date) {
            var endDate = new Date(date);
            endDate.setHours(23);
            endDate.setMinutes(59);
            return endDate;
        },
        getShortDate: function (date) {

            if (!date) {
                date = new Date();
            }

            var dd = date.getDate();
            var mm = date.getMonth() + 1; //January is 0!
            var yyyy = date.getFullYear();
            if (dd < 10) {
                dd = '0' + dd
            }
            if (mm < 10) {
                mm = '0' + mm
            }
            date = mm + '/' + dd + '/' + yyyy;
            return date;
        },
        findFirstDateInTheWeek: function (date) {

            date = new Date(date);

            while (date.getDay() != 0) {
                date.setDate(date.getDate() - 1);
            }

            return date;
        },
        findFirstDateInMonth: function (date) {

            date = new Date(date);

            while (date.getDate() != 1) {
                date.setDate(date.getDate() - 1);
            }

            return date;
        },
        findLastDateInMonth: function (date) {
            var first = that.Utils.Date.findFirstDateInMonth(date);
            var last = new Date(first);
            last.setMonth(first.getMonth() + 1);
            last.setDate(first.getDate() - 1);
            last.setFullYear(first.getFullYear());
            return last;
        },
        findLastDateInWeek: function (date) {
            date = new Date(date);
            var last = that.Utils.Date.findFirstDateInTheWeek(date);
            last.setDate(last.getDate() + 6);
            return last;
        },
        findFirstWeekdayInMonth: function (date) {
            var first = new Date(date);
            first = this.findFirstDateInMonth(first);
            first = this.findFirstDateInTheWeek(first);
            return first;
        },
        findLastWeekdayInMonth: function (date) {
            var last = new Date(date);
            last = this.findLastDateInMonth(last);
            last = this.findLastDateInWeek(last);
            return last;
        },
        dateDiff: function (end, start) {
            var datediff = end.getTime() - start.getTime(); //store the getTime diff - or +
            return (Math.ceil(datediff / (24 * that.Constants.General.HOUR * that.Constants.General.MILLISECONDS))); //Convert values to -/+ days and return value
        }
    },
    Math: {
        percentageOfDivision: function (dividend, divisor) {
            var percentage = parseInt(dividend) / parseInt(divisor);
            percentage *= 100;
            percentage = Math.ceil(percentage * 10) / 10;
            percentage = (!isNaN(percentage) && percentage != Infinity) ? percentage : 0;
            return percentage;
        },
        convertToOneDecimalPointNumber: function (number) {
            return (Math.ceil(number * 10) / 10);
        }
    }
}


function toggleLoading(jqueryElementName, isShowAndHide) {

    var URL_LOADING = 'url(loading.gif)';

    if ($(jqueryElementName).css('background-image') != 'none') {
        $(jqueryElementName).css('background', '');
        if (isShowAndHide === true) {
            $(jqueryElementName).fadeOut();
        }
    }
    else {
        if ($(jqueryElementName).text() === "") {
            $(jqueryElementName).text('\xa0\xa0\xa0\xa0\xa0');
        }
        $(jqueryElementName).css('background-image', 'url(loading.gif)')
            .css('background-repeat', 'no-repeat')
            .css('background-position', 'center');
        if (isShowAndHide === true) {
            $(jqueryElementName).fadeIn();
        }
    }
}


$(function () {
    $("#manualLapSlider").slider({
        max: 36000,
        step: 300,
        slide: function (event, ui) {
            $('#addManualLap_Length').text(that.Goals.getGoalTime(ui.value));
        }
    });


    $("#dailyGoalSlider").slider({
        max: 10 * that.Constants.General.HOUR,
        step: 0.5 * that.Constants.General.HOUR,
        slide: function (event, ui) {
            $('#goal_time_to_set_day').text(that.Goals.getGoalTime(ui.value));
        }
    });

    $("#weeklyGoalSlider").slider({
        max: 30 * that.Constants.General.HOUR,
        step: 1 * that.Constants.General.HOUR,
        slide: function (event, ui) {
            $('#goal_time_to_set_week').text(that.Goals.getGoalTime(ui.value));
        }
    });

    $("#monthlyGoalSlider").slider({
        max: 95 * that.Constants.General.HOUR,
        step: 5 * that.Constants.General.HOUR,
        slide: function (event, ui) {
            $('#goal_time_to_set_month').text(that.Goals.getGoalTime(ui.value));
        }
    });

    var progressbar = $("#progressbar"),
        progressLabel = $("#progressLabel");

    $("#timerProgressBar").progressbar({

        /*change: function() {
         progressLabel.text( progressbar.progressbar( "value" ) + "%" );
         },*/
        complete: function () {
            //   progressLabel.text( "Complete!" );
        }
    });

    $(function () {
        $("#datepicker").datepicker({maxDate: "+0D", onSelect: onSelect});
        $("#datepicker").datepicker("setDate", "+0");

        function onSelect(dateText, inst) {
            chart(dateText);
        }

    });

});

that.jQuery = {
    Timer: {
        init: function () {
            // Restore unsaved lap if browser exited unexpectedly
            var unsavedLap = that.CookieHandler.readCookie(that.Constants.Cookies.COOKIE_CURRENT_LAP);
            if (unsavedLap > 0) {
                that.Stopwatch.setLapTime(unsavedLap);
            }
            $('#time').text(that.Utils.Time.formatTime(that.Stopwatch.time()));

        },
        setjQuery: function () {
            $('#start_timer_button').click(this.startTimer);
        },
        startTimer: function () {
            var button = $('#start_timer_button');
            var buttonText;

            if (button.text() == "Start") {
                that.Stopwatch.clocktimer = setInterval(function () {
                    that.Stopwatch.update()
                }, that.Constants.General.UPDATE_INTERVAL);
                that.Stopwatch.start();
            }
            else {
                that.Laps.saveLap(that.Utils.Time.timeStringToSeconds($('#time').text()), '#start_timer_button');
                that.Stopwatch.stop();
                document.title = "Stopped";
                clearInterval(that.Stopwatch.clocktimer);
                that.CookieHandler.eraseCookie(that.Constants.Cookies.COOKIE_CURRENT_LAP);
                that.Stopwatch.reset();
            }
            buttonText = button.text() == "Start" ? "Stop" : "Start";
            button.text(buttonText);
        }
    }
}

$(document).ready(function () {

    that.Session.initParse();

    that.jQuery.Timer.init();
    that.jQuery.Timer.setjQuery();

    that.Session.login();

    that.DatePicker.jQuery();


    /*    if (Parse.User.current() != null) {

     that.Session.facebookLogin = Parse.FacebookUtils.isLinked(Parse.User.current());

     if (that.Session.facebookLogin === true) {
     that.Facebook.init();
     }
     else {
     that.Session.onUserLogin();
     }
     }*/
    $(window).resize(function(){

        that.Session.handleScreenSize();
    });
    $("#updateDayGoal").click(function () {
        $('#updateDayGoalDiv').slideToggle();
        $(this).toggleClass("grayButton-sel").toggleClass('grayButton');
    });

    $('#addManualLap_Date').text(that.Utils.Date.getShortDate());

    $('#addManualLapButton').click(function () {
        $('#addManualLapSection').slideToggle();
        $(this).toggleClass("smallGrayButton-sel");
    });

    $('#addManualLap_Save').click(function () {
        var manualLapLength = $('#manualLapSlider').slider("value");
        //currentDailyProgress += manualLapLength;
        that.Laps.saveLap(manualLapLength, this, function () {
            $('#addManualLapButton').click()
        }, true);
    });

    $('.expandCollapseTitle').click(function () {
        $(this).next().slideToggle();
    });

    $(".goalTime").click(function () {
        $(this).next().toggle();
    });

    // Calls the that.Goals.setGoal function (d/w/m) respectively by the calling element
    /*$(".setGoalButton").click(function () {
     var fn = $(this).attr('id');
     fn = fn.replace('Button', '');
     fn = "that.Goals." + fn;
     window[fn]();
     });*/

    $('#setDailyGoalButton').click(function () {
        that.Goals.setDailyGoal();
    })

    $('#setWeeklyGoalButton').click(function () {
        that.Goals.setWeeklyGoal();
    })

    $('#setMonthlyGoalButton').click(function () {
        that.Goals.setMonthlyGoal();
    })


    $("#goals_icon").click(function () {
        $("#set_goals_container").slideToggle();
    });
    $("#settings_icon").click(function () {
        $("#settings_container").slideToggle();
    });

    $('#setting_show_breaks_on_graphs').click(function () {
        setting_show_breaks_on_graphs = $(this).is(':checked');
    });

    $('#user_log_out_button').click(function () {

        that.Session.clear();
        $('#user_login_container').fadeIn(1000);

    });

    $('#user_icon').mouseenter(function () {
        $('#user_log_out_panel').slideDown();
    })

    $('#user_icon').mouseleave(function () {
        $('#user_log_out_panel').delay(1000).slideUp();
    })

    $('#user_log_out_panel').mouseenter(function () {
        $(this).stop(true);
        $(this).slideDown();
    })
    $('#user_log_out_panel').mouseleave(
        function () {
            $('#user_log_out_panel').delay(1000).slideUp();
        });

    $('#login_button').click(function () {

        toggleLoading($(this));
        var User = Parse.Object.extend("User");

        var query = new Parse.Query(User);
        query.equalTo("username", $('#username_input').val());
        query.first().then(function (result) {
            if (result == undefined) {
                $('#login_button').hide();
                toggleLoading($('#login_button'));
                $('#user_signup').slideDown();
                $('#back_to_login_with_facebook').hide();
            }
            else {
                Parse.User.logIn($('#username_input').val(), "password").then(function () {
                    toggleLoading($('#login_button'));
                    that.Session.login();
                });
            }
        });
    });

    $('#username_input').keypress(function (e) {
        var code = e.keyCode || e.which;
        if (code == that.Constants.General.ENTER_KEYCODE) {
            $('#login_button').click();
        }
        ;
        $('#user_signup').slideUp();
        $('#login_button').show();
    });

    $('#user_signup_button').click(function () {
        var user = new Parse.User();

        user.set("username", $('#username_input').val());
        user.set("password", "password");
        user.set("email", $('#username_input').val() + "@" + $('#username_input').val() + ".com");

        toggleLoading('#user_signup_button');

        user.signUp(null, {
            success: function (user) {
                toggleLoading('#user_signup_button');
                $('#user_signup').hide();
                $('#login_button').show();
                that.Session.onUserLogin();
            },
            error: function (user, error) {
                // Show the error message somewhere and let the user try again.
                toggleLoading('#user_signup_button');
                alert("Error: " + error.code + " " + error.message);
            }
        });
    });

    /* Load Project */
    $("#projects_container").on('click', '.project', function () {
        that.CookieHandler.createCookie(that.Constants.Cookies.COOKIE_CURRENT_PROJECT, $(this).attr("parseid"));
        that.CookieHandler.createCookie(that.Constants.Cookies.COOKIE_CURRENT_PROJECT_TITLE, $(this).text());
        that.Projects.onProjectLoad($(this).attr("parseid"), $(this).text());
    });

    /* Project Delete */
    $("#projects_container").on('mouseenter', '.project',
        function () {
            //$('#projects_container' > '.delete_icon').show();
            $(this).find('.delete_icon').show();
        }
    );
    $("#projects_container").on('mouseleave', '.project',
        function () {
            $(this).find('.delete_icon').hide();
        }
    );

    $("#projects_container").on('click', '.delete_icon',
        function (event) {
            //alert($(this).parent().attr('parseid'));
            that.Projects.deleteProject($(this).parent().attr('parseid'));
            event.stopPropagation();
        }
    );


    $('#show_new_project_details_button').click(function () {
        $('#new_project_details').slideDown();
    });

    $('#add_project_button').click(function () {
        var Project = Parse.Object.extend("Projects");
        var newProject = new Project();
        toggleLoading('#add_project_button');
        newProject.save({title: $('#project_title_input').val(), user: Parse.User.current(), state: that.Constants.Parse.STATE_ENABLED}).then(function (object) {
            toggleLoading('#add_project_button');
            that.Projects.addProject(object);
            $('#new_project_details').slideUp();
            $('#project_title_input').val("");
        });
    });

    /* Back to projects list */
    $('#project_title_container').hover(
        function () {
            $(this).find('.back_icon').show();
        },
        function () {
            $(this).find('.back_icon').hide();
        });

    $('#project_title_container > .back_icon').click(function () {
        // clear session TODO
        $('#application').hide();
        $('#settings_icon').hide();
        $('#goals_icon').hide();
        $('#facebook_icon').hide();
        $('#log_table').text("");
        that.Projects.loadProjects();
        $('#projects_container').fadeIn();
    });

    $('#chart_month_back_button').click(function () {
        clearTimeout(timeOut);
        var date = new Date($('#chart_month_date').text().substr(0, 10));
        date.setMonth(date.getMonth() - 1);
        var first = that.Utils.Date.findFirstDateInMonth(date);
        var last = that.Utils.Date.findLastDateInMonth(date);
        date = that.Utils.Date.getShortDate(date);
        $('#chart_month_date').text(that.Utils.Date.getShortDate(first) + " - " + that.Utils.Date.getShortDate(last));
        timeOut = setTimeout(function () {
            that.Chart.monthlyChart(first)
        }, that.Constants.General.CLICK_TIMEOUT);
    });
    $('#chart_month_forward_button').click(function () {
        clearTimeout(timeOut);
        var date = new Date($('#chart_month_date').text().substr(0, 10));
        date.setMonth(date.getMonth() + 1);
        var first = that.Utils.Date.findFirstDateInMonth(date);
        var last = that.Utils.Date.findLastDateInMonth(date);
        date = that.Utils.Date.getShortDate(date);
        $('#chart_month_date').text(that.Utils.Date.getShortDate(first) + " - " + that.Utils.Date.getShortDate(last));
        timeOut = setTimeout(function () {
            that.Chart.monthlyChart(first)
        }, that.Constants.General.CLICK_TIMEOUT);
    });

    /* Log */
    $('#log_input').keypress(function (e) {
        var code = e.keyCode || e.which;
        if (code == that.Constants.General.ENTER_KEYCODE) {
            var time = that.Utils.Time.convertDateToHHMMString(new Date());
            var data = $(this).val();
            if (data != "") {
                var Log = Parse.Object.extend("Logs");
                var logEntry = new Log();
                toggleLoading('#log_input');
                logEntry.save({
                    data: data,
                    time: time,
                    date: that.Utils.Date.getShortDate(),
                    project: currentProject,
                    type: that.Constants.Parse.LOG_ADD_ICON,
                    state: that.Constants.Parse.STATE_ENABLED
                }).then(function (object) {
                        toggleLoading('#log_input');
                        $('#log_input').val("");
                        that.Log.addLogEntry(object);
                    });
            }
        }
    });

    $('.log_today_move_button').click(function () {

        var button = $(this).attr("id");
        var margin; // TODO:CHANGE VAR NAME
        button.indexOf("back") == -1 ? margin = 1 : margin = -1;
        clearTimeout(timeOut);
        var date = new Date($('#log_today_date').text());
        date.setDate(date.getDate() + margin);
        date = that.Utils.Date.getShortDate(date);
        $('#log_today_date').text(date);
        $('#log_table').text("");

        timeOut = setTimeout(function () {
            if (that.Utils.Date.getShortDate() === date) {
                $('#log_input').show();
            }
            else {
                $('#log_input').hide();
            }
            that.Log.loadLogEntries(date)
        }, that.Constants.General.CLICK_TIMEOUT);
    });

    $('#facebook_icon').click(function () {
        that.Facebook.postToFacebook();
    });

    $('#login_with_nettime').click(function () {
        $(this).parent().hide();
        $('#facebook_login_button').hide();
        $('#back_to_login_with_facebook').parent().show();
        $('#nettime_login_container').slideDown();
    });

    $('#back_to_login_with_facebook').click(function () {
        $(this).parent().hide();
        $('#login_with_nettime').parent().show();
        $('#nettime_login_container').slideUp();
        $('#facebook_login_button').show();
    });

    $('#facebook_login_button').click(function () {
        $('#loading').css('display','inline-block').show();
        toggleLoading('#loading');
        that.Facebook.init().then(function () {
            that.Session.onUserLogin();
        });
    });
});





