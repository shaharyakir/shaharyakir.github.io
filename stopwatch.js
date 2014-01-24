var that = {};

/*
 Gloabal Vars
 */
var currentProject;
var currentProjectTitle;
var timeOut = 0;

/* Settings*/
var setting_show_breaks_on_graphs = false;

that.Constants = {
    Parse: {
        WEEKLY_GOAL_TYPE: "WEEKLY",
        MONTHLY_GOAL_TYPE: "MONTHLY",
        DAILY_GOAL_TYPE: "DAILY",
        STATE_ENABLED: 1,
        STATE_DISABLED: 2,
        LOG_ADD_ICON: 1,
        LOG_BREAK_ICON: 2,
        LOG_MISC_ICON: 3
    },
    General: {
        ENTER_KEYCODE: 13,
        CLICK_TIMEOUT: 500,
        HOUR: 3600,
        MILLISECONDS: 1000,
        UPDATE_INTERVAL: 100
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
that.Session = {
    facebookLogin: false,
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
        $('#facebook_icon_large').show();
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
    onUserLogin:function() {
    $('#user_login_container').hide();
    $('#projects_container').fadeIn(1000);

    // TODO:improve
    if (that.Session.facebookLogin === true) {
        FB.api(
            "/me?fields=name",
            function (response) {
                if (response && !response.error) {
                    $('#current_user').text(response.name);
                }
            }
        );
    }
    else {
        $('#current_user').text(Parse.User.current().getUsername());
    }

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
    loadApplication:function() {
        $('#application').fadeIn(1000);
        that.Log.loadLogEntries();
        that.Session.updateAllObjects();
    }

}
that.Facebook = {
    init: function () {

        $.ajaxSetup({ cache: true });
        $.getScript('//connect.facebook.net/en_UK/all.js', function () {
            Parse.FacebookUtils.init({
                appId: '801581419859259', // Facebook App ID
                status: false, // check login status
                cookie: true, // enable cookies to allow Parse to access the session
                xfbml: true  // parse XFBML
            });

            if (that.Session.facebookLogin === false) {

                Parse.FacebookUtils.logIn(null, {
                    success: function (user) {
                        if (!user.existed()) {
                            console.log("User signed up and logged in through Facebook!");
                            that.Session.facebookLogin = true;
                            that.Session.onUserLogin();
                        } else {
                            console.log("User logged in through Facebook!");
                            that.Session.facebookLogin = true;
                            that.Session.onUserLogin();
                        }
                    },
                    error: function (user, error) {
                        console.log("User cancelled the Facebook login or did not fully authorize.");
                    }
                });
            }
            else {
                console.log("User was already logged in through Facebook! Proceeding to nettime login");
                that.Session.facebookLogin = true;
                that.Session.onUserLogin();
            }
        });


    },
    postToFacebook: function () {

        FB.ui(
            {
                method: 'feed',
                name: 'NetTime',
                caption: 'Look what I achieved!',
                description: (
                    'I worked for ' + $('#dashboard_today_hours').text() + ' hours today ' +
                        'on my ' + $('#project_title').text() + ' project ' +
                        'and reached ' + $('#dashboard_today_percentage').text() + ' of my goal!'
                    ),
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
            promise.resolve(value);
            if (!value) {
                $("#set_daily_goal_section").show();
            }
            else {
                $("#dashboard_today_goal").text(that.Goals.getGoalTime(value.get("goal")));
                $("#goal_time_to_set_day").text(that.Goals.getGoalTime(value.get("goal")));
                $("#dailyGoalSlider").slider("value", value.get("goal"));
            }
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
            promise.resolve(value);
            if (!value) {
                $("#set_weekly_goal_section").show();
            }
            else {
                $("#dashboard_week_goal").text(that.Goals.getGoalTime(value.get("goal")));
                $("#goal_time_to_set_week").text(that.Goals.getGoalTime(value.get("goal")));
                $("#weeklyGoalSlider").slider("value", value.get("goal"));
            }
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
            promise.resolve(value);
            if (!value) {
                $("#set_monthly_goal_section").show();
            }
            else {
                $("#dashboard_month_goal").text(that.Goals.getGoalTime(value.get("goal")));
                $("#goal_time_to_set_month").text(that.Goals.getGoalTime(value.get("goal")));
                $("#monthlyGoalSlider").slider("value", value.get("goal"));
            }
        }));

        return promise.promise();
    }
}
that.Chart = {

    renderCharts: function () {
        that.Chart.dailyChart();
        that.Chart.weeklyChart();
        that.Chart.monthlyChart();
    },
    dailyChart: function (date) {

        var promise = $.Deferred();
        var dps = [];
        var manualDps = [];
        var goalDps = [];
        var firstLap;
        var manualLapCount = 0;
        var length = 0;

        var dateToCheck = date ? date : that.Utils.Date.getShortDate();

        toggleLoading('#chart_today_chart_overlay', true);


        // TODO: handle a case when there's no first lap!!!
        that.Laps.findFirstLap(dateToCheck)  // Get the first lap (use it as the manual lap start time)
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
                        zoomEnabled: true,
                        height: 290,
//                    width: "30%",
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
                toggleLoading('#chart_today_chart_overlay', true);
                promise.resolve();
            }
        );

        return promise.promise();
    },
    weeklyChart: function (date) {

        var dps = [];
        var manualDps = [];
        var goalDps = [];
        var firstLap;
        var manualLapCount = 0;
        var length = 0;
        var promise = $.Deferred();

        var dateToCheck = date ? date : that.Utils.Date.getShortDate();
        toggleLoading('#chart_week_chart_overlay', true);

        var start = that.Utils.Date.findFirstDateInTheWeek(dateToCheck);
        var end = that.Utils.Date.findLastDateInWeek(dateToCheck);

        // TODO: handle a case when there's no first lap!!!
        that.Laps.findFirstLap(start, end)  // Get the first lap (use it as the manual lap start time)
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
                    chartx.render();
                }
                else {
                    $('#chart_week_chart').text("No data");
                }
                toggleLoading('#chart_week_chart_overlay', true);
                promise.resolve();
            }
        );
        return promise.promise();
    },
    monthlyChart: function (date) {

        var dps = [];
        var manualDps = [];
        var goalDps = [];
        var firstLap;
        var manualLapCount = 0;
        var length = 0;

        var dateToCheck = date ? date : that.Utils.Date.getShortDate();
        toggleLoading('#chart_month_chart_overlay', true);

        var start = that.Utils.Date.findFirstDateInMonth(dateToCheck);
        var end = that.Utils.Date.findLastDateInMonth(dateToCheck);

        // TODO: handle a case when there's no first lap!!!
        that.Laps.findFirstLap(start, end)  // Get the first lap (use it as the manual lap start time)
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
                return that.Goals.isMonthlyGoalSet(start)
            })
            .then(function (value) {
                if (dps.length > 0 && value) {
                    var goal = value.get("goal") / 3600;
                    goalDps.push({x: dps[0].x, y: goal});
                    goalDps.push({x: dps[dps.length - 1].x, y: goal});
                }
            })
            .then(function () {

                var chartx = new CanvasJS.Chart("chart_month_chart",
                    {
                        backgroundColor: "#f8f8f8",
                        zoomEnabled: true,
                        height: 290,
//                    width: 650,
                        title: {
                        },
                        axisX: {
                            valueFormatString: "DD",
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
                    chartx.render();
                }
                else {
                    $('#chart_month_chart').text("No data");
                }
                toggleLoading('#chart_month_chart_overlay', true);

            }
        );
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
    getLaps:function(startDate, endDate) {
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
    findFirstLap:function(startDate, endDate){
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
    getManualLapTotalLength:function(startDate, endDate) {
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
    getTotalLapLengthByDate:function(startDate, endDate) {

    var promise = $.Deferred();

    if (endDate === undefined || endDate === startDate) {
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
    }
    ;

    var Laps = Parse.Object.extend("Laps");
    var query = new Parse.Query(Laps);
    //query.equalTo("date", startDate);


    query.greaterThanOrEqualTo("createdAt", startDate);
    query.lessThanOrEqualTo("createdAt", endDate);
    query.equalTo("project", currentProject);
    query.limit(1000);

    query.find().then(function (results) {
        var totalLength = 0;


        for (var i = 0; i < results.length; i++) {
            var object = results[i];
            totalLength += parseInt(object.get('length'));
        }

        promise.resolve(totalLength);
    });

    return promise.promise();
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
            var last = new Date();
            last.setMonth(first.getMonth() + 1);
            last.setDate(first.getDate() - 1);
            last.setFullYear(first.getFullYear());
            return last;
        },
        findLastDateInWeek: function (date) {
            date = new Date(date);
            var last = that.Utils.Date.findFirstDateInTheWeek(date);
            last.setDate(date.getDate() + 6);
            return last;
        }
    },
    Math: {
        percentageOfDivision: function (dividend, divisor) {
            var percentage = parseInt(dividend) / parseInt(divisor);
            percentage *= 100;
            percentage = Math.ceil(percentage * 10) / 10;
            percentage = (!isNaN(percentage) && percentage != Infinity) ? percentage : 0;
            return percentage;
        }
    }
}
that.Projects = {
    loadProjects: function () {
        var Projects = Parse.Object.extend("Projects");
        var query = new Parse.Query(Projects);
        /*var username = Parse.User.current().get("username");*/

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
        $('#chart_today_date').text(that.Utils.Date.getShortDate());
        $('#log_today_date').text(that.Utils.Date.getShortDate());
        var lastDayOfWeek = new Date(that.Utils.Date.findFirstDateInTheWeek(that.Utils.Date.getShortDate()));
        lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 6);
        $('#chart_week_date').text(that.Utils.Date.getShortDate(that.Utils.Date.findFirstDateInTheWeek(that.Utils.Date.getShortDate())) + " - " + that.Utils.Date.getShortDate(lastDayOfWeek));
        $('#chart_month_date').text(that.Utils.Date.getShortDate(that.Utils.Date.findFirstDateInMonth(that.Utils.Date.getShortDate())) + " - " + that.Utils.Date.getShortDate(that.Utils.Date.findLastDateInMonth(that.Utils.Date.getShortDate())));
        that.Session.loadApplication();

    }
}
that.Dashboard = {
    updateDashboard: function () {

        var today = new Date(that.Utils.Date.getShortDate());
        var todayEnd = that.Utils.Date.getEndOfDayDate(today);

        that.Goals.isDailyGoalSet().then(function () {
            toggleLoading('#dashboard_today_hours');
            that.Laps.getTotalLapLengthByDate(today, todayEnd).then(function (totalLapLength) {
                that.Dashboard.updateDashboardData(totalLapLength, '#dashboard_today')
            });

        });

        that.Goals.isWeeklyGoalSet().then(function () {
            toggleLoading('#dashboard_week_hours');
            that.Laps.getTotalLapLengthByDate(that.Utils.Date.findFirstDateInTheWeek(today), todayEnd).then(function (totalLapLength) {
                that.Dashboard.updateDashboardData(totalLapLength, '#dashboard_week')
            });

        });

        that.Goals.isMonthlyGoalSet().then(function () {
            toggleLoading('#dashboard_month_hours');
            that.Laps.getTotalLapLengthByDate(that.Utils.Date.findFirstDateInMonth(today), todayEnd).then(function (totalLapLength) {
                that.Dashboard.updateDashboardData(totalLapLength, '#dashboard_month')
            });
        });
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
        var bestPossibleTime = new Date()
        bestPossibleTime.setTime((goalLeft * that.Constants.General.MILLISECONDS) + bestPossibleTime.getTime());
        bestPossibleTime = goalLeft > 0 ? that.Utils.Time.convertDateToHHMMString(bestPossibleTime) : "N/A";

        if ($(dashboardJQueryElement + "best_possible_time").length) {
            $(dashboardJQueryElement + "best_possible_time").text(bestPossibleTime);
        }
        $(dashboardJQueryElement + "_left").text(that.Utils.Time.secondsToString(Math.max(goalLeft, 0)).substr(0, 5));

        toggleLoading(dashboardJQueryElement + "_hours");
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

    if (Parse.User.current() != null) {

        that.Session.facebookLogin = Parse.FacebookUtils.isLinked(Parse.User.current());

        if (that.Session.facebookLogin === true) {
            that.Facebook.init();
        }
        else {
            that.Session.onUserLogin();
        }
    }
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
    $(".that.Goals.setGoalButton").click(function () {
        var fn = $(this).attr('id');
        fn = fn.replace('Button', '');
        window[fn]();
    });

    $(".day_week_month_button").click(function () {
        $(this).siblings().removeClass('day_week_month_button_selected');
        $(this).addClass('day_week_month_button_selected');

        var id = $(this)[0].id
        id = id.replace("_button", "");
        id = "#" + id;
        $(id).siblings().hide();
        $(id).show();
    });

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
                    that.Session.onUserLogin();
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

    /* Chart Date Handlers */
    $('#chart_today_back_button').click(function () {
        clearTimeout(timeOut);
        var date = new Date($('#chart_today_date').text());
        date.setDate(date.getDate() - 1);
        date = that.Utils.Date.getShortDate(date);
        $('#chart_today_date').text(date);
        timeOut = setTimeout(function () {
           that.Chart.dailyChart(date)
        }, that.Constants.General.CLICK_TIMEOUT);
    });

    $('#chart_today_forward_button').click(function () {
        clearTimeout(timeOut);
        var date = new Date($('#chart_today_date').text());
        date.setDate(date.getDate() + 1);
        date = that.Utils.Date.getShortDate(date);
        $('#chart_today_date').text(date);
        timeOut = setTimeout(function () {
            that.Chart.dailyChart(date)
        }, that.Constants.General.CLICK_TIMEOUT);
    });

    $('#chart_week_back_button').click(function () {
        clearTimeout(timeOut);
        var date = new Date($('#chart_week_date').text().substr(0, 10));
        date.setDate(date.getDate() - 7);
        var first = that.Utils.Date.findFirstDateInTheWeek(date);
        var last = that.Utils.Date.findLastDateInWeek(first);
        $('#chart_week_date').text(that.Utils.Date.getShortDate(first) + " - " + that.Utils.Date.getShortDate(last));
        timeOut = setTimeout(function () {
            that.Chart.weeklyChart(first)
        }, that.Constants.General.CLICK_TIMEOUT);
    });

    $('#chart_week_forward_button').click(function () {
        clearTimeout(timeOut);
        var date = new Date($('#chart_week_date').text().substr(0, 10));
        date.setDate(date.getDate() + 7);
        var first = that.Utils.Date.findFirstDateInTheWeek(date);
        var last = that.Utils.Date.findLastDateInWeek(first);
        $('#chart_week_date').text(that.Utils.Date.getShortDate(first) + " - " + that.Utils.Date.getShortDate(last));
        timeOut = setTimeout(function () {
            that.Chart.weeklyChart(first)
        }, that.Constants.General.CLICK_TIMEOUT);
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
        $('#facebook_icon_large').hide();
        $('#back_to_login_with_facebook').parent().show();
        $('#nettime_login_container').slideDown();
    });

    $('#back_to_login_with_facebook').click(function () {
        $(this).parent().hide();
        $('#login_with_nettime').parent().show();
        $('#nettime_login_container').slideUp();
        $('#facebook_icon_large').show();
    });

    $('#facebook_icon_large').click(function () {
        toggleLoading('#facebook_icon_large');
        that.Facebook.init();
    });
});





