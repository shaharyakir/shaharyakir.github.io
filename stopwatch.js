/*
 Constants & Gloabal Vars
 */
var COOKIE_CURRENT_LAP = "currentLap";
var COOKIE_CURRENT_PROJECT = "currentProjectId";
var COOKIE_CURRENT_PROJECT_TITLE = "currentProjectTitle";
var HOUR = 3600;
var MILLISECONDS = 1000;
var UPDATE_INTERVAL = 100;
var CLICK_TIMEOUT = 500;
//var currentGoalLength = 0;
//var currentDailyProgress = 0;
//var currentProjectId;
var currentProject;
var currentProjectTitle;
var timeOut = 0;

/* Settings*/
var setting_show_breaks_on_graphs = false;

/*
 Parse.com constants
 */
var WEEKLY_GOAL_TYPE = "WEEKLY";
var MONTHLY_GOAL_TYPE = "MONTHLY";
var DAILY_GOAL_TYPE = "DAILY";
var STATE_ENABLED = 1;
var STATE_DISABLED = 2;
var ENTER_KEYCODE = 13;

var LOG_ADD_ICON = 1;
var LOG_BREAK_ICON = 2;
var LOG_MISC_ICON = 3;

// TODO: wrap in a cookie Handler object - when I learn OO!
/*
 ================
 Cookie functions
 ================
 */
var cookieHandler = function () {
    this.createCookie = function (name, value) {
        var exdays = 365;
        var exdate = new Date();
        exdate.setDate(exdate.getDate() + exdays);
        value = escape(value) + ((exdays == null) ? "" : "; expires=" + exdate.toUTCString());
        document.cookie = name + "=" + value;
    }
    this.readCookie = function (name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    };
    this.eraseCookie = function (name) {
        this.createCookie(name, "", -1);
    };
};

/*
 ================
 Stopwatch class
 ================
 */
var clsStopwatch = function () {
    // Private vars
    var startAt = 0;	// Time of last start / resume. (0 if not running)
    var lapTime = 0;	// Time on the clock when last stopped in milliseconds

    var now = function () {
        return (new Date()).getTime();
    };

    // Public methods
    // Start or resume
    this.start = function () {
        startAt = startAt ? startAt : now();
    };

    // Stop or pause
    this.stop = function () {
        // If running, update elapsed time otherwise keep it
        lapTime = startAt ? lapTime + now() - startAt : lapTime;
        startAt = 0; // Paused
    };

    // Reset
    this.reset = function () {
        lapTime = startAt = 0;
    };

    // Duration
    this.time = function () {
        return lapTime + (startAt ? now() - startAt : 0);
    };

    this.setLapTime = function (newLap) {
        //startAt=now();
        lapTime = parseInt(newLap);
    }
};

var x = new clsStopwatch();
var time;
var clocktimer;
var cookieHandlerInstance = new cookieHandler();
/*
 ===========================
 Stopwatch related functions
 ===========================
 */
function stop() {


    x.stop();

    clearInterval(clocktimer);

    cookieHandlerInstance.eraseCookie(COOKIE_CURRENT_LAP);

    reset();


}
function reset() {
    x.reset();
    update();
}
function update() {
    $('#time').text(formatTime(x.time()));
    cookieHandlerInstance.createCookie(COOKIE_CURRENT_LAP, x.time());
    document.title = "(" + formatTime(x.time()) + ")" + " Running";

}

function start() {

    var button = document.getElementById("startButton");

    if (button.innerHTML == "Start") {
        clocktimer = setInterval("update()", UPDATE_INTERVAL);
        x.start();
    }
    else {
        var howLong = document.getElementById("time").innerHTML;

        saveLap(timeStringToSeconds($('#time').text()), '#startButton');

        stop();
        document.title = "Stopped";
    }
    var newVal = button.innerHTML == "Start" ? "Stop" : "Start";
    button.innerHTML = newVal;
}

function saveLap(value, jqueryPressedElement, callback, isManual) {

    if (value > 0) {
        toggleLoading(jqueryPressedElement);
        var TestObject = Parse.Object.extend("Laps");
        var testObject = new TestObject();
        isManual = isManual ? isManual : false;
        testObject.save({length: value, date: getShortDate(), isManualLap: isManual, project: currentProject}).then(function () {
            toggleLoading(jqueryPressedElement);
            updateAllObjects();
            if (callback) {
                callback()
            }
            ;
        });
    }
}

function updateAllObjects() {
    //buildWeekTable();
    //updateProgressBar();
    updateDashboard();
    areAllGoalsSet().then(function (value) {
        if (value === true) {
            $("#center_section").slideDown();
        }
    })
    renderCharts();
}

/*
 ================
 Util functions
 ================
 */

function dividedValueToPercentage(val) {
    var percentage = val * 100;
    percentage = Math.ceil(percentage * 10) / 10;
    percentage = (!isNaN(percentage) && percentage != Infinity) ? percentage + "%" : "0%";
    return percentage;
}

function pad(num, size) {
    var s = "0000" + num;
    return s.substr(s.length - size);
}

function formatTime(time) {
    var h = m = s = ms = 0;
    var newTime = '';

    h = Math.floor(time / (60 * 60 * 1000));
    time = time % (60 * 60 * 1000);
    m = Math.floor(time / (60 * 1000));
    time = time % (60 * 1000);
    s = Math.floor(time / 1000);

    newTime = pad(h, 2) + ':' + pad(m, 2) + ':' + pad(s, 2);
    return newTime;
}

function getShortDate(date) {

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
}

function timeStringToSeconds(string) {
    var number;

    var hours = parseInt(string.split(":")[0]);
    var minutes = parseInt(string.split(":")[1]);
    var seconds = parseInt(string.split(":")[2]);
    seconds = seconds || 0;

    number = (hours * 3600) + (minutes * 60) + seconds;

    return parseInt(number);

}

function secondsToString(time) {
    var h = m = s = ms = 0;
    var newTime = '';

    h = Math.floor(time / (60 * 60));
    time = time % (60 * 60);
    m = Math.floor(time / (60));
    time = time % (60 );
    s = Math.floor(time);

    newTime = pad(h, 2) + ':' + pad(m, 2) + ':' + pad(s, 2);
    return newTime;
}
// date - a Date object
// offset - an amount in seconds to subtract or add to the time
function dateObjectToHHMM(date, offset) {
    date = offset ? (new Date(date - offset * 1000)) : date;
    var hours = date.getHours() < 10 ? '0' + date.getHours() : date.getHours();
    var minutes = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
    return hours + ":" + minutes;
}

function initParse() {
    if (document.title == "Test") {
        Parse.initialize("75yStvvNmep3ZhsC5VAtMBSUGjoECMmmNI7aHxTK", "BZxsbuz6tYffL4Ld09pO5tswvBVrvVLoROezGlpR");
    }
    else {
        Parse.initialize("vnkcS0pKaV0JYhW37n7DI2JPpiAftf5b6WmXM0Kw", "bzqGddUaGZc7cjsp7RxJfsOVMQVFXGCMiKzxbZz5");
    }
}

function findFirstDateInTheWeek(date) {

    date = new Date(date);

    while (date.getDay() != 0) {
        date.setDate(date.getDate() - 1);
    }

    return date;
}

function findFirstDateInMonth(date) {

    date = new Date(date);

    while (date.getDate() != 1) {
        date.setDate(date.getDate() - 1);
    }

    return date;
}

function findLastDateInMonth(date) {
    var first = findFirstDateInMonth(date);
    var last = new Date();
    last.setMonth(first.getMonth() + 1);
    last.setDate(first.getDate() - 1);
    last.setFullYear(first.getFullYear());
    return last;
}

function findLastDateInWeek(date) {
    date = new Date(date);
    var last = findFirstDateInTheWeek(date);
    last.setDate(date.getDate() + 6);
    return last;
}


/*
 ================
 OnLoad
 ================
 */
function show() {


    time = document.getElementById('time');

    // Restore unsaved lap if browser exited unexpectedly
    var unsavedLap = cookieHandlerInstance.readCookie(COOKIE_CURRENT_LAP);
    if (unsavedLap > 0) {
        x.setLapTime(unsavedLap);
    }

    time.innerHTML = formatTime(x.time()); // set the timer initial time


    /*updateAllObjects();*/
}


/*
 ================
 Weekly table
 ================

 function buildWeekTable() {

 //$('this_week_table_tbody').text('');
 toggleLoading('#this_week_table');
 var days = [];
 var counter = 0;
 var doQuery = function (currDate) {
 var day = {};
 day.date = currDate;
 day.length = 0;
 day.goal = 0;
 var Laps = Parse.Object.extend("Laps");
 var query = new Parse.Query(Laps);
 query.equalTo("date", currDate);
 query.find().then(function (results) {
 var totalLength = 0;
 for (var i = 0; i < results.length; i++) {
 var object = results[i];
 totalLength += parseInt(object.get('length'));
 }

 day.length = totalLength
 }
 ).then(function () {
 var DailyGoals = Parse.Object.extend("DailyGoals");
 var query = new Parse.Query(DailyGoals);
 query.equalTo("date", currDate);
 return query.find();

 }).then(function (results) {

 if (results[0]) {
 day.goal = parseInt(results[0].get("goal"));
 }
 else {
 day.goal = 0;
 }
 }).then(function () { // Retrieve the last and first lap date
 var Laps = Parse.Object.extend("Laps");
 var query = new Parse.Query(Laps);
 query.equalTo("date", currDate);
 query.ascending("createdAt");
 return query.first();
 })
 .then(function (object) {
 day.firstLap = object ? dateObjectToHHMM(object.createdAt, (object.get("length"))) : "00:00";
 })
 .then(function () {
 var Laps = Parse.Object.extend("Laps");
 var query = new Parse.Query(Laps);
 query.equalTo("date", currDate);
 query.descending("createdAt");
 return query.first();
 })
 .then(function (object) {
 day.lastLap = object ? dateObjectToHHMM(object.createdAt) : "00:00";
 }
 )
 .always(function () {
 counter++;
 days.push(day);
 if (counter === 7) {
 days.sort(function (a, b) {
 a = new Date(a.date);
 b = new Date(b.date);
 return a > b ? -1 : a < b ? 1 : 0;
 });
 days.sort();
 callbackBuildWeekTable(days);
 }
 });
 }

 for (var i = 6; i >= 0; i--) {
 date = getShortDate(i * -1);
 doQuery(date);
 }
 }
 function callbackBuildWeekTable(days) {
 var table = document.getElementById("this_week_table_tbody");
 table.innerHTML = "";
 var i, row, date, length, dayCell, lengthCell, goalCell, percentageCell, firstLapCell, lastLapCell;

 for (i = 0; i < days.length; i++) {

 var percentage = ((days[i].length / days[i].goal) * 100);
 percentage = Math.ceil(percentage * 10) / 10;
 percentage = (!isNaN(percentage) && percentage != Infinity) ? percentage + "%" : "0%";

 row = document.createElement('tr');
 dayCell = document.createElement('td');
 dayCell.appendChild(document.createTextNode(days[i].date));
 lengthCell = document.createElement('td');
 lengthCell.appendChild(document.createTextNode(secondsToString(days[i].length)));
 goalCell = document.createElement('td');
 goalCell.appendChild(document.createTextNode(secondsToString(days[i].goal)));
 percentageCell = document.createElement('td');
 percentageCell.appendChild(document.createTextNode(percentage));
 firstLapCell = document.createElement('td');
 firstLapCell.appendChild(document.createTextNode(days[i].firstLap));
 lastLapCell = document.createElement('td');
 lastLapCell.appendChild(document.createTextNode(days[i].lastLap));

 row.appendChild(dayCell);
 row.appendChild(lengthCell);
 row.appendChild(goalCell);
 row.appendChild(percentageCell);
 row.appendChild(firstLapCell);
 row.appendChild(lastLapCell);

 table.appendChild(row);
 }
 toggleLoading('#this_week_table');
 }

 */

/*
 ================
 All Goals
 ================
 */
function areAllGoalsSet() {

    var promise = $.Deferred();

    var answer = new Boolean(true);

    isDailyGoalSet()
        .then(function (value) {

            answer = answer && (value != undefined);

        })
        .then(isWeeklyGoalSet()
            .then(function (value) {
                answer = answer && (value != undefined);
            }))
        .then(isMonthlyGoalSet()
            .then(function (value) {
                answer = answer && (value != undefined);
                promise.resolve(answer);
            }));
    return promise;
}


function getGoalTime(value) {
    return secondsToString(value).substr(0, 5);
}
function isGoalSet(date, type) {
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
}

function setGoal(date, type, length) {
    var parseGoal = Parse.Object.extend("Goals");
    var parseGoalRecord;

    var promise = $.Deferred();

    $.when(isGoalSet(date, type).done(function (value) {
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
            updateAllObjects();
        });
    }));

    return promise.promise();
}


/*
 ================
 Daily Goal
 ================
 */

function setDailyGoal() {
    var goal = timeStringToSeconds($("#goal_time_to_set_day").text());
    var date = getShortDate();
    setGoal(date, DAILY_GOAL_TYPE, goal).then(function () {
        $("#setDailyGoalSection").hide();
    });
}

function isDailyGoalSet(date) {
    var promise = $.Deferred();
    date = date ? date : getShortDate();

    isGoalSet(date, DAILY_GOAL_TYPE).then(function (value) {
        promise.resolve(value);
        if (!value) {
            $("#setDailyGoalSection").show();
        }
        else {
            $("#goalTime_day").text(getGoalTime(value.get("goal")));
            $("#goal_time_to_set_day").text(getGoalTime(value.get("goal")));
            $("#dailyGoalSlider").slider("value", value.get("goal"));
        }
    });

    return promise.promise();
}

/*
 ================
 Weekly Goal
 ================
 */
function setWeeklyGoal() {
    var goal = timeStringToSeconds($("#goal_time_to_set_week").text());
    var date = getShortDate(findFirstDateInTheWeek(getShortDate()));
    setGoal(date, WEEKLY_GOAL_TYPE, goal).then(function () {
        $("#setWeeklyGoalSection").hide();
    });
}

function isWeeklyGoalSet(date) {
    var promise = $.Deferred();
    date = date ? getShortDate(date) : getShortDate(findFirstDateInTheWeek(getShortDate()));

    $.when(isGoalSet(date, WEEKLY_GOAL_TYPE).done(function (value) {
        promise.resolve(value);
        if (!value) {
            $("#setWeeklyGoalSection").show();
        }
        else {
            $("#goalTime_week").text(getGoalTime(value.get("goal")));
            $("#goal_time_to_set_week").text(getGoalTime(value.get("goal")));
            $("#weeklyGoalSlider").slider("value", value.get("goal"));
        }
    }));

    return promise.promise();
}

/*
 ================
 Monthly Goal
 ================
 */
function setMonthlyGoal() {
    var goal = timeStringToSeconds($("#goal_time_to_set_month").text());
    var date = getShortDate(findFirstDateInMonth(getShortDate()));
    setGoal(date, MONTHLY_GOAL_TYPE, goal).then(function () {
        $("#setMonthlyGoalSection").hide();
    });
}

function isMonthlyGoalSet(date) {
    var promise = $.Deferred();
    date = date ? getShortDate(date) : getShortDate(findFirstDateInMonth(getShortDate()));
    $.when(isGoalSet(date, MONTHLY_GOAL_TYPE).done(function (value) {
        promise.resolve(value);
        if (!value) {
            $("#setMonthlyGoalSection").show();
        }
        else {
            $("#goalTime_month").text(getGoalTime(value.get("goal")));
            $("#goal_time_to_set_month").text(getGoalTime(value.get("goal")));
            $("#monthlyGoalSlider").slider("value", value.get("goal"));
        }
    }));

    return promise.promise();
}


/*
 =====
 OTHER
 =====
 */
function displayOtherTextBox() {
    document.getElementById("stopReasonButtons").style.display = "none";
    document.getElementById("otherTextBox").style.display = "inline";
}
function getTotalLapLengthByDate(startDate, endDate) {

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

/*
 *  ----------------
 *  Dashboard
 *  ----------------
 * */


function updateDashboard() {

    var today = new Date(getShortDate());
    var todayEnd = new Date(getShortDate());
    todayEnd.setHours(23);
    todayEnd.setMinutes(59);

    // Update daily
    isDailyGoalSet().then(function () {
        toggleLoading('#dashboard_today_hours');
        getTotalLapLengthByDate(today, todayEnd).then(function (value) {
            $("#dashboard_today_hours").text(Math.ceil((value / 3600) * 10) / 10);
            $("#dashboard_today_time").text(secondsToString(value));
            var dailyGoal = timeStringToSeconds($("#goalTime_day").text());
            var dailyGoalLeft = dailyGoal - value;
            $("#goalTime_day_left").text(secondsToString(dailyGoalLeft).substr(0, 5));
            $("#daily_goal_percentage").text(dividedValueToPercentage(value / dailyGoal));
            var bestPossibleTime = new Date()
            bestPossibleTime.setTime((dailyGoalLeft * MILLISECONDS) + bestPossibleTime.getTime());
            bestPossibleTime = dateObjectToHHMM(bestPossibleTime);
            $("#goalTime_day_best_time").text(bestPossibleTime);
            toggleLoading('#dashboard_today_hours');
        });
    });

    // Update weekly
    isWeeklyGoalSet().then(function () {
        toggleLoading('#dashboard_week_hours');
        getTotalLapLengthByDate(findFirstDateInTheWeek(today), todayEnd).then(function (value) {
            $("#dashboard_week_hours").text(Math.ceil((value / 3600) * 10) / 10);
            $("#dashboard_week_time").text(secondsToString(value));
            var weeklyGoal = timeStringToSeconds($("#goalTime_week").text());
            $("#weekly_goal_percentage").text(dividedValueToPercentage(value / weeklyGoal));
            var weeklyGoalLeft = weeklyGoal - value;
            $("#goalTime_week_left").text(secondsToString(weeklyGoalLeft).substr(0, 5));
            toggleLoading('#dashboard_week_hours');
        });
    });

    // Update monthly
    isMonthlyGoalSet().then(function () {
        toggleLoading('#dashboard_month_hours');
        getTotalLapLengthByDate(findFirstDateInMonth(today), todayEnd).then(function (value) {
            $("#dashboard_month_hours").text(Math.ceil((value / 3600) * 10) / 10);
            $("#dashboard_month_time").text(secondsToString(value));
            var monthlyGoal = timeStringToSeconds($("#goalTime_month").text());
            $("#monthly_goal_percentage").text(dividedValueToPercentage(value / monthlyGoal));
            var monthlyGoalLeft = monthlyGoal - value;
            $("#goalTime_month_left").text(secondsToString(monthlyGoalLeft).substr(0, 5));
            toggleLoading('#dashboard_month_hours');
        });
    });
}

function loadProjects() {
    var Projects = Parse.Object.extend("Projects");
    var query = new Parse.Query(Projects);
    var username = Parse.User.current().get("username");

    $('#projects_list').text(" ");
    toggleLoading('#projects_list');

    query.equalTo("user", Parse.User.current());
    query.notEqualTo("state", STATE_DISABLED);
    query.find().then(function (results) {
        toggleLoading('#projects_list');
        for (var i = 0; i < results.length; i++) {
            var object = results[i];
            addProject(object);
        }
    });
}

function addProject(parseObject) {
    var element =
        "<div class='project' parseid='" + parseObject.id + "'>" + parseObject.get("title") +
            "<span class='icon delete_icon' id='delete_icon' style='display:none'></span>" +
            "</div>";
    $('#projects_list').append(element);
}

function deleteProject(parseid) {
    var Projects = Parse.Object.extend("Projects");
    var query = new Parse.Query(Projects);
    query.equalTo("objectId", parseid);
    query.first().then(function (proj) {
        proj.set('state', STATE_DISABLED);
        proj.save().then(function () {
            $('#projects_list').text("");
            loadProjects();
        });
    });
}

function onProjectLoad(id, title) {
    var Project = Parse.Object.extend("Projects");
    currentProject = new Project();
    currentProject.id = id;
    currentProjectTitle = title;

    $('#projects_container').hide();
    $('#project_title').text(currentProjectTitle);
    $('#settings_icon').show();
    $('#goals_icon').show();
    $('#chart_today_date').text(getShortDate());
    $('#log_today_date').text(getShortDate());
    var lastDayOfWeek = new Date(findFirstDateInTheWeek(getShortDate()));
    lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 6);
    $('#chart_week_date').text(getShortDate(findFirstDateInTheWeek(getShortDate())) + " - " + getShortDate(lastDayOfWeek));
    $('#chart_month_date').text(getShortDate(findFirstDateInMonth(getShortDate())) + " - " + getShortDate(findLastDateInMonth(getShortDate())));
    loadApplication();

}

function onUserLogin() {
    $('#user_login_container').hide();
    $('#projects_container').fadeIn(1000);
    $('#current_user').text(Parse.User.current().getUsername());
    $('#settings_panel').show();
    $('#user_panel').show();

    var projectIdFromCookie = cookieHandlerInstance.readCookie(COOKIE_CURRENT_PROJECT);
    var projectTitleFromCookie = cookieHandlerInstance.readCookie(COOKIE_CURRENT_PROJECT_TITLE);
    var isProjectCached = ((projectIdFromCookie != "") && (projectTitleFromCookie != "") && (projectIdFromCookie != null) && (projectTitleFromCookie != null));
    if (isProjectCached == true) {
        projectTitleFromCookie = decodeURIComponent(projectTitleFromCookie);
        onProjectLoad(projectIdFromCookie, projectTitleFromCookie);
    }
    else {
        loadProjects();
    }
}

function loadApplication() {
    $('#application').fadeIn(1000);
    loadLogEntries();
    updateAllObjects();
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

// ********
// jQueryUI
// ********
$(function () {
    $("#manualLapSlider").slider({
        max: 36000,
        step: 300,
        change: function (event, ui) {
            $('#addManualLap_Length').text(getGoalTime(ui.value));
        }
    });


    $("#dailyGoalSlider").slider({
        max: 10 * HOUR,
        step: 0.5 * HOUR,
        change: function (event, ui) {
            $('#goal_time_to_set_day').text(getGoalTime(ui.value));
        }
    });

    $("#weeklyGoalSlider").slider({
        max: 30 * HOUR,
        step: 1 * HOUR,
        change: function (event, ui) {
            $('#goal_time_to_set_week').text(getGoalTime(ui.value));
        }
    });

    $("#monthlyGoalSlider").slider({
        max: 95 * HOUR,
        step: 5 * HOUR,
        change: function (event, ui) {
            $('#goal_time_to_set_month').text(getGoalTime(ui.value));
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


/* Chart */

function getLaps(startDate, endDate) {
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
}

function findFirstLap(startDate, endDate) {
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
        var val = result ? (result.createdAt - (result.get("length") * MILLISECONDS)) : undefined;
        promise.resolve(val);
    });

    return promise.promise();
}

function getManualLapTotalLength(startDate, endDate) {
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
}

function renderCharts() {
    /*dailyChart().then(function () {
     weeklyChart().then(function(){
     monthlyChart();
     });
     });*/

    dailyChart();
    weeklyChart();
    monthlyChart();
}

function dailyChart(date) {

    var promise = $.Deferred();
    var dps = [];
    var manualDps = [];
    var goalDps = [];
    var firstLap;
    var manualLapCount = 0;
    var length = 0;

    var dateToCheck = date ? date : getShortDate();

    toggleLoading('#chart_today_chart_overlay', true);


    // TODO: handle a case when there's no first lap!!!
    findFirstLap(dateToCheck)  // Get the first lap (use it as the manual lap start time)
        .then(function (result) {
            if (result) {
                firstLap = result;
            }
            ;
        })
        .then(function () {
            return getManualLapTotalLength(dateToCheck);  // Get today's total manual lap time
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
            return getLaps(dateToCheck);
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
            return isDailyGoalSet(dateToCheck)
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
}

function weeklyChart(date) {

    var dps = [];
    var manualDps = [];
    var goalDps = [];
    var firstLap;
    var manualLapCount = 0;
    var length = 0;
    var promise = $.Deferred();

    var dateToCheck = date ? date : getShortDate();
    toggleLoading('#chart_week_chart_overlay', true);

    var start = findFirstDateInTheWeek(dateToCheck);
    var end = findLastDateInWeek(dateToCheck);

    // TODO: handle a case when there's no first lap!!!
    findFirstLap(start, end)  // Get the first lap (use it as the manual lap start time)
        .then(function (result) {
            if (result) {
                firstLap = result;
            }
            ;
        })
        .then(function () {
            return getManualLapTotalLength(start, end);  // Get total manual lap time
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
            return getLaps(start, end);
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
            return isWeeklyGoalSet(start);
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
}

function monthlyChart(date) {

    var dps = [];
    var manualDps = [];
    var goalDps = [];
    var firstLap;
    var manualLapCount = 0;
    var length = 0;

    var dateToCheck = date ? date : getShortDate();
    toggleLoading('#chart_month_chart_overlay', true);

    var start = findFirstDateInMonth(dateToCheck);
    var end = findLastDateInMonth(dateToCheck);

    // TODO: handle a case when there's no first lap!!!
    findFirstLap(start, end)  // Get the first lap (use it as the manual lap start time)
        .then(function (result) {
            if (result) {
                firstLap = result;
            }
            ;
        })
        .then(function () {
            return getManualLapTotalLength(start, end);  // Get total manual lap time
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
            return getLaps(start, end);
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
            return isMonthlyGoalSet(start)
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

/*
 *  ----------------
 *  jQuery Functions
 *  ----------------
 * */

$(document).ready(function () {

    initParse();
    initFaceBook(

        function(){

            Parse.FacebookUtils.logIn(null, {
                success: function(user) {
                    if (!user.existed()) {
                        console.log("User signed up and logged in through Facebook!");
                    } else {
                        console.log("User logged in through Facebook!");
                        FB.ui(
                            {
                                method: 'feed',
                                name: 'NetTime',
                                caption: 'Look what I achieved!',
                                description: (
                                    '03:30 Work!'
                                    ),
                                link: 'http://localhost:63343/Net',
                                picture: 'http://localhost:63343/Net/images/logo.png'
                                /*link: 'http://users14.jabry.com/nettime',*/
//                                picture: 'http://users14.jabry.com/nettime/images/logo.png'
                            },
                            function(response) {
                                if (response && response.post_id) {
                                    console.log('Post was published.');
                                } else {
                                    console.log('Post was not published.');
                                }
                            }
                        );
                    }
                },
                error: function(user, error) {
                    console.log("User cancelled the Facebook login or did not fully authorize.");
                }
            });

        });


    if (Parse.User.current() != null) {
        onUserLogin();
    }

    $("#updateDayGoal").click(function () {
        $('#updateDayGoalDiv').slideToggle();
        $(this).toggleClass("grayButton-sel").toggleClass('grayButton');
    });

    $('#addManualLap_Date').text(getShortDate());

    $('#addManualLapButton').click(function () {
        $('#addManualLapSection').slideToggle();
        $(this).toggleClass("smallGrayButton-sel");
    });

    $('#addManualLap_Save').click(function () {
        var manualLapLength = $('#manualLapSlider').slider("value");
        //currentDailyProgress += manualLapLength;
        saveLap(manualLapLength, this, function () {
            $('#addManualLapButton').click()
        }, true);
    });

    $('.expandCollapseTitle').click(function () {
        $(this).next().slideToggle();
    });

    $(".goalTime").click(function () {
        $(this).next().toggle();
    });

    // Calls the setGoal function (d/w/m) respectively by the calling element
    $(".setGoalButton").click(function () {
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
        $('#user_log_out_panel').hide();
        Parse.User.logOut();
        $('#projects_list').text("");
        cookieHandlerInstance.eraseCookie(COOKIE_CURRENT_PROJECT);
        cookieHandlerInstance.eraseCookie(COOKIE_CURRENT_PROJECT_TITLE);
        $('#log_table').text("");
        $('#application').hide();
        $('#projects_container').hide();
        $('#settings_icon').hide();
        $('#goals_icon').hide();
        $('#user_panel').hide();
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
            }
            else {
                Parse.User.logIn($('#username_input').val(), "password").then(function () {
                    toggleLoading($('#login_button'));
                    onUserLogin();
                });
            }
        });
    });

    $('#username_input').keypress(function (e) {
        var code = e.keyCode || e.which;
        if (code == ENTER_KEYCODE) {
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
                onUserLogin();
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
        cookieHandlerInstance.createCookie(COOKIE_CURRENT_PROJECT, $(this).attr("parseid"));
        cookieHandlerInstance.createCookie(COOKIE_CURRENT_PROJECT_TITLE, $(this).text());
        onProjectLoad($(this).attr("parseid"), $(this).text());
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
            deleteProject($(this).parent().attr('parseid'));
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
        newProject.save({title: $('#project_title_input').val(), user: Parse.User.current(), state: STATE_ENABLED}).then(function (object) {
            toggleLoading('#add_project_button');
            addProject(object);
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
        $('#log_table').text("");
        loadProjects();
        $('#projects_container').fadeIn();
    });

    /* Chart Date Handlers */
    $('#chart_today_back_button').click(function () {
        clearTimeout(timeOut);
        var date = new Date($('#chart_today_date').text());
        date.setDate(date.getDate() - 1);
        date = getShortDate(date);
        $('#chart_today_date').text(date);
        timeOut = setTimeout(function () {
            dailyChart(date)
        }, CLICK_TIMEOUT);
    });

    $('#chart_today_forward_button').click(function () {
        clearTimeout(timeOut);
        var date = new Date($('#chart_today_date').text());
        date.setDate(date.getDate() + 1);
        date = getShortDate(date);
        $('#chart_today_date').text(date);
        timeOut = setTimeout(function () {
            dailyChart(date)
        }, CLICK_TIMEOUT);
    });

    $('#chart_week_back_button').click(function () {
        clearTimeout(timeOut);
        var date = new Date($('#chart_week_date').text().substr(0, 10));
        date.setDate(date.getDate() - 7);
        var first = findFirstDateInTheWeek(date);
        var last = findLastDateInWeek(first);
        $('#chart_week_date').text(getShortDate(first) + " - " + getShortDate(last));
        timeOut = setTimeout(function () {
            weeklyChart(first)
        }, CLICK_TIMEOUT);
    });

    $('#chart_week_forward_button').click(function () {
        clearTimeout(timeOut);
        var date = new Date($('#chart_week_date').text().substr(0, 10));
        date.setDate(date.getDate() + 7);
        var first = findFirstDateInTheWeek(date);
        var last = findLastDateInWeek(first);
        $('#chart_week_date').text(getShortDate(first) + " - " + getShortDate(last));
        timeOut = setTimeout(function () {
            weeklyChart(first)
        }, CLICK_TIMEOUT);
    });


    $('#chart_month_back_button').click(function () {
        clearTimeout(timeOut);
        var date = new Date($('#chart_month_date').text().substr(0, 10));
        date.setMonth(date.getMonth() - 1);
        var first = findFirstDateInMonth(date);
        var last = findLastDateInMonth(date);
        date = getShortDate(date);
        $('#chart_month_date').text(getShortDate(first) + " - " + getShortDate(last));
        timeOut = setTimeout(function () {
            monthlyChart(first)
        }, CLICK_TIMEOUT);
    });
    $('#chart_month_forward_button').click(function () {
        clearTimeout(timeOut);
        var date = new Date($('#chart_month_date').text().substr(0, 10));
        date.setMonth(date.getMonth() + 1);
        var first = findFirstDateInMonth(date);
        var last = findLastDateInMonth(date);
        date = getShortDate(date);
        $('#chart_month_date').text(getShortDate(first) + " - " + getShortDate(last));
        timeOut = setTimeout(function () {
            monthlyChart(first)
        }, CLICK_TIMEOUT);
    });

    /* Log */
    $('#log_input').keypress(function (e) {
        var code = e.keyCode || e.which;
        if (code == ENTER_KEYCODE) {
            var time = dateObjectToHHMM(new Date());
            var data = $(this).val();
            if (data != "") {
                var Log = Parse.Object.extend("Logs");
                var logEntry = new Log();
                toggleLoading('#log_input');
                logEntry.save({
                    data: data,
                    time: time,
                    date: getShortDate(),
                    project: currentProject,
                    type: LOG_ADD_ICON,
                    state: STATE_ENABLED
                }).then(function (object) {
                        toggleLoading('#log_input');
                        $('#log_input').val("");
                        addLogEntry(object);
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
        date = getShortDate(date);
        $('#log_today_date').text(date);
        $('#log_table').text("");

        timeOut = setTimeout(function () {
            if (getShortDate() === date) {
                $('#log_input').show();
            }
            else {
                $('#log_input').hide();
            }
            loadLogEntries(date)
        }, CLICK_TIMEOUT);
    });
});


/* Log */
function loadLogEntries(date) {
    var Log = Parse.Object.extend("Logs");
    var query = new Parse.Query(Log);
    date = date ? date : getShortDate();
    toggleLoading('#log_overlay', true);
    query.equalTo("project", currentProject);
    query.equalTo("date", date);
    query.notEqualTo("state", STATE_DISABLED);
    query.find().then(function (results) {
        toggleLoading('#log_overlay', true);
        for (var i = 0; i < results.length; i++) {
            var object = results[i];
            addLogEntry(object);
        }
    });
}

function addLogEntry(parseObject) {

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


/* */
function initFaceBook(updateStatusCallback) {

    $.ajaxSetup({ cache: true });
    $.getScript('//connect.facebook.net/en_UK/all.js', function(){
        /*FB.init({
            appId: '801581419859259'
        });
        *//*$('#loginbutton,#feedbutton').removeAttr('disabled');*//*
        FB.getLoginStatus(updateStatusCallback);*/

        Parse.FacebookUtils.init({
            appId      : '801581419859259', // Facebook App ID
            channelUrl : '//connect.facebook.net/en_UK/all.js', // Channel File
            status     : true, // check login status
            cookie     : true, // enable cookies to allow Parse to access the session
            xfbml      : true  // parse XFBML
        });

        FB.getLoginStatus(updateStatusCallback);
    });

}

