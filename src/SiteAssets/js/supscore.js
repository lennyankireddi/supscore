// JavaScript code for Astellas VSM Supplier Scorecard

// Global variables
var supplierSegmentListPath = "";

// Shared utility functions 

function GetQueryStringParameter(param) {
    param = param.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var exs = "[\\?&]" + param + "=([^&#]*)";
    var regex = new RegExp(exs);
    var results = regex.exec(window.location.href);
    if (results == null) {
        return "";
    }
    else {
        return decodeURIComponent(results[1].replace(/\+/g, " "));
    }
}

function GetConfigurationValue(key) {
    var configValue = "";
    configUrl = _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/getbytitle('Configuration')/items?$filter=Title eq '" + key + "'&$select=Title,Value&$top=1";
    $.ajax({
        url: configUrl,
        method: "GET",
        async: false,
        headers: {
            "accept": "application/json;odata=verbose"
        },
        success: function(data) {
            if (data.d.results.length > 0) {
                configValue = data.d.results[0].Value;
            }
        }
    });
    return configValue;
}

// End shared utility functions

// Data load functions 

function GetSupplierData() {
    var supListUrl = GetConfigurationValue("SupplierSegmentsListSitePath") + "/_api/web/lists/getbytitle('IS Supplier Segments')/items?$select=Title,SupplierID";
    return $.ajax({
        url: supListUrl,
        method: "GET",
        headers: {
            "accept": "application/json;odata=verbose"
        },
        success: function(data) {
            supplierData = data.d.results;
        },
        error: function(err) {
            console.log(JSON.stringify(err));
        }
    });
}

function GetSchema() {
    var schemaUrl = "/sites/astellasvsm/supscore/_api/web/lists/getbytitle('Schema')/items?$select=Title,Metric,Format&$top=100";
    return $.ajax({
        url: schemaUrl,
        method: "GET",
        headers: {
            "accept": "application/json;odata=verbose"
        },
        error: function(err) {
            console.log(JSON.stringify(err));
        }
    });
}

var loadData = function LoadData() {
    var filePath = "/sites/astellasvsm/supscore/shared%20documents/Astellas Supplier Segmentation_Data Worksheet_FY17.csv";
    
    $.ajax({
        type: "GET",
        url: filePath,
        dataType: "text",
        success: function(data) {
            // Capture all records as objects
            records = $.csv.toObjects(data);
            
            // Get Supplier data from master table
            GetSupplierData().done(function(supplierData) {
                GetSchema().done(function(schema) {
                    $.each(records, function(i, record) {
                        // Check if the supplier is in the supplier segmentation table
                        var matches = $.grep(supplierData.d.results, function(s, i) { return s.Title == record["Supplier Name"]; });
                        if (matches.length > 0) {
                            console.log(matches.length + " match(es) found for " + record['Supplier Name'] + " - Supplier ID: " + matches[0].SupplierID);
                        }
                        else {
                            console.log("No matches found for " + record['Supplier Name']);
                        }
                    });
                });
            }).fail(function(err) {
                console.log(JSON.stringify(err));
            });
        },
        error: function(err) {
            console.log(JSON.stringify(err));
        }
    });
}

// End data load functions

// Shared data retrieval functions

function GetAllDataPointsForSupplier(supplier) {
    var dataPoints;
    reqUrl = _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/getbytitle('Datapoints')/items?$select=Title,Period,Valid,Value,DataFormat,DisplayFormat,Supplier,Group&$filter=Supplier eq '" + supplier + "'&$top=1000&$orderby=Valid desc";
    $.ajax({
        url: reqUrl,
        method: "GET",
        async: false,
        headers: {
            "accept": "application/json;odata=verbose"
        },
        success: function(data) {
            dataPoints = data.d.results;
        },
        error: function(err) {
            console.log(JSON.stringify(err));
        }
    });
    return dataPoints;
}

function GetDataPoints(supplier, metric, period) {
    reqUrl = _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/getbytitle('Datapoints')/items?$select=Title,Period,Valid,Value,DataFormat,DisplayFormat,Supplier&$filter=Supplier eq '" + supplier + "' and Title eq '" + metric + "' and Period eq '" + period + "'";
    $.ajax({
        url: reqUrl,
        method: "GET",
        async: false,
        headers: {
            "accept": "application/json;odata=verbose"
        },
        success: function(data) {
            return data.d.results;
        },
        error: function(err) {
            console.log(JSON.stringify(err));
        }
    });
}

function GetValueForYear(dataPoints, year) {
    $.each(dataPoints, function(i, dp) {
        if ((new Date(dp.Valid)).getFullYear() == year) {
            return GetFormattedString(dp.Value, dp.DisplayFormat);
        }
    });
}

function GetFormattedString(value, format) {
    var prefix = format.substring(0, format.indexOf("{"));
    var suffix = format.substring(format.indexOf("}") + 1);
    var formatString = format.substring(format.indexOf("{") + 1, format.indexOf("}"));

    // If the format needs to be a number
    if (formatString.indexOf("0.") > -1) {
        // Find number of decimal places
        var decimals = formatString.substring(formatString.indexOf(".") + 1).length;
        return prefix + parseFloat(value).toFixed(decimals) + suffix;
    }

    return prefix + value + suffix;
}

function GetMetricDataPoints(dataPoints, metric, period) {
    var points = $.grep(dataPoints, function(dp, i) {
        return (dp.Title == metric && dp.Period == period);
    });
    return points;
}

function GetLatestMetricValue(dataPoints, metric, period) {
    var points = $.grep(dataPoints, function(dp, i) {
        return (dp.Title == metric && dp.Period == period && dp.Group == "ALL");
    });
    // points.sort(function(a, b) { return (new Date(a.Valid)) > (new Date(b.Valid))});
    return GetFormattedString(points[0].Value, points[0].DisplayFormat);
    //return points[0].Value;
}

function GetLatestMetricDate(dataPoints, metric, period) {
    var points = $.grep(dataPoints, function(dp, i) {
        return (dp.Title == metric && dp.Period == period);
    });
    points.sort(function(a, b) { return (new Date(a.Valid)) > (new Date(b.Valid))});
    return points[0].Valid;
}

function GetMetricPointsForSpecificPeriod(dataPoints, metric, period, periodValue) {
    var points = $.grep(dataPoints, function(dp, i) {
        return (dp.Title == metric && dp.Period == period && ComparePeriod(dp.Valid, period, periodValue));
    });
    return points;
}

function ComparePeriod(valid, period, periodValue) {
    var result = false;

    switch (period) {
        case "Year": if ((new Date(valid)).getFullYear() == periodValue) result = true;
            break;
        case "Quarter": 
            switch ((new Date(valid)).getMonth()) {
                case 0: if (periodValue == 1) result = true;
                    break;
                case 1: if (periodValue == 1) result = true;
                    break;
                case 2: if (periodValue == 1) result = true;
                    break;
                case 3: if (periodValue == 2) result = true;
                    break;
                case 4: if (periodValue == 2) result = true;
                    break;
                case 5: if (periodValue == 2) result = true;
                    break;
                case 6: if (periodValue == 3) result = true;
                    break;
                case 7: if (periodValue == 3) result = true;
                    break;
                case 8: if (periodValue == 3) result = true;
                    break;
                case 9: if (periodValue == 4) result = true;
                    break;
                case 10: if (periodValue == 4) result = true;
                    break;
                case 11: if (periodValue == 4) result = true;
                    break;
            }
            break;
        case "Month": if ((new Date(valid)).getMonth() == periodValue) result = true;
            break;
    }

    return result;
}

// End shared data retrieval functions


// Vendor List table functions

function GetSegmentText(segment) {
    switch(segment) {
        case "IS Transactional Supplier": return "<span class='segment segment-tran'>Transactional</span>";
        case "IS Strategic Partner": return "<span class='segment segment-strg'>Strategic</span>";
        case "IS Preferred Supplier": return "<span class='segment segment-pref'>Preferred</span>";
        case "IS Specialty Supplier": return "<span class='segment segment-spec'>Specialty</span>";
    }
}

function GetServiceCategories(sw, hw, svc, oth) {
    var svcs = [];
    if (sw) svcs.push("Software");
    if (hw) svcs.push("Hardware");
    if (svc) svcs.push("Services");
    if (oth) svcs.push("Other");
    return svcs.toString();
}

function GetSentiment(health) {
    switch(status.toLowerCase()) {
        case "good": return "<img src='/sites/astellasvsm/SiteAssets/images/frownoff.png' class='sentiment-icon'>" +
                            "<img src='/sites/astellasvsm/SiteAssets/images/mehoff.png' class='sentiment-icon'>" +
                            "<img src='/sites/astellasvsm/SiteAssets/images/smileon.png' class='sentiment-icon'>";
        case "fair": return "<img src='/sites/astellasvsm/SiteAssets/images/frownoff.png' class='sentiment-icon'>" +
                            "<img src='/sites/astellasvsm/SiteAssets/images/mehon.png' class='sentiment-icon'>" +
                            "<img src='/sites/astellasvsm/SiteAssets/images/smileoff.png' class='sentiment-icon'>";
        case "poor": return "<img src='/sites/astellasvsm/SiteAssets/images/frownon.png' class='sentiment-icon'>" +
                            "<img src='/sites/astellasvsm/SiteAssets/images/mehoff.png' class='sentiment-icon'>" +
                            "<img src='/sites/astellasvsm/SiteAssets/images/smileoff.png' class='sentiment-icon'>";
        default: return "<img src='/sites/astellasvsm/SiteAssets/images/frownoff.png' class='sentiment-icon'>" +
                            "<img src='/sites/astellasvsm/SiteAssets/images/mehoff.png' class='sentiment-icon'>" +
                            "<img src='/sites/astellasvsm/SiteAssets/images/smileoff.png' class='sentiment-icon'>";
    }
}

function PopulateVendorList() {
    $("#vendorTableBody").append("<tr><td><i class='fa fa-spinner fa-pulse'></i>&nbsp;Loading supplier data...</td></tr>");
    var supSegListUrl = _spPageContextInfo.siteAbsoluteUrl + supplierSegmentListPath + "/_api/web/lists/getbytitle('IS Supplier Segments')/items?$select=Title,SupplierID,PurchasingRegion,ISSupplierSegment,Software,Other,Hardware,Services&$top=1000";
    $.ajax({
        url: supSegListUrl,
        method: "GET",
        headers: {
            "accept": "application/json;odata=verbose"
        },
        success: function(data) {
            $("#vendorTableBody").empty();
            var dataPoints;
            $.each(data.d.results, function(i, item) {
                // Get Spend for prior and current year
                var thisYear = (new Date()).getFullYear();
                var priorYearSpend = "Unknown";
                var currentYearSpend = "Unknown";
                // dataPoints = GetDataPoints(item.Title, "Spend", "Year");
                // priorYearSpend = GetValueForYear(dataPoints, thisYear - 1);
                // currentYearSpend = GetValueForYear(dataPoints, thisYear);

                // Get CSAT for current year
                var csat = "Unknown";
                // dataPoints = GetDataPoints(item.Title, "CSAT", "Year");
                // csat = GetValueForYear(dataPoints, thisYear);
                
                // Get Health for current year
                var health = "Unknown";
                // dataPoints = GetDataPoints(item.Title, "Health", "Year");
                // health = GetValueForYear(dataPoints, thisYear);

                // Add the row for this supplier to the table
                $("#vendorTableBody").append(
                    "<tr>" +
                        "<td><a href='Supplier.aspx?id=" + item.SupplierID + "'>" + item.Title + "</a></td>" +
                        "<td>" + item.PurchasingRegion.replace(" Regional", "") + "</td>" +
                        "<td>" + GetSegmentText(item.ISSupplierSegment) + "</td>" +
                        "<td>" + GetServiceCategories(item.Software, item.Hardware, item.Services, item.Other) + "</td>" +
                        "<td>" + priorYearSpend + "</td>" +
                        "<td>" + currentYearSpend + "</td>" +
                        "<td>" + csat + "</td>" +
                        "<td>" + GetSentiment(health) + "</td>" +
                    "</tr>"
                );
            });
            $("#vendorTable").DataTable({
                "paging": true,
                "searching": true,
                "info": false
            });
        },
        error: function(err) {
            console.log(JSON.stringify(err));
        }
    });
}

// End Vendor List table functions

/* Supplier Page scripts */

function LoadSupplierData(supplierId) {
    // Load banner with supplier information
    var supplierUrl = GetConfigurationValue("SupplierSegmentsListSitePath") + "/_api/web/lists/getbytitle('IS Supplier Segments')/items?$filter=SupplierID eq '" + supplierId + "'&$select=Title,SupplierID,PurchasingRegion,ISSupplierSegment,Software,Other,Hardware,Services&$top=1";
    $.ajax({
        url: supplierUrl,
        method: "GET",
        headers: {
            "accept": "application/json;odata=verbose"
        },
        success: function(data) {
            if (data.d.results.length > 0) {
                var vendor = data.d.results[0];
                $(".vendor-title").text(vendor.Title);
                $(".vendor-segment").text("Segment: " + vendor.ISSupplierSegment);
                $(".vendor-category").text("Category: " + GetServiceCategories(vendor.Software, vendor.Hardware, vendor.Services, vendor.Other));
            }
        }
    });

    // Get all data for the supplier
    var allDataPoints = GetAllDataPointsForSupplier(supplierId);
    $(".reporting-period").text("Reporting Period: " + moment(GetLatestMetricDate(allDataPoints, "Health", "Year")).format("MMM-YYYY"));
    $(".vendor-health").text("Overall Supplier Health: " + GetLatestMetricValue(allDataPoints, "Health", "Year"));

    // Populate year spend
    $(".year-spend-number").text(GetLatestMetricValue(allDataPoints, "Spend", "Year"));

    // Draw the IS spend percentage pie chart
    var spendPctValue = GetLatestMetricValue(allDataPoints, "ISSpendPct", "Year");
    var spendPctData = {
        datasets: [{
            data: [spendPctValue, Math.round(100 - spendPctValue)],
            backgroundColor: [
                'rgba(0, 76, 151, 1)',
                'rgba(200, 200, 200, 1)'
            ]
        }],
        labels: [
            '% of total IS Spend',
            'Other'
        ]
    };
    var spendPctPieCtx = $("#spendPctPie");
    var spendPctPie = new Chart(spendPctPieCtx, {
        type: 'pie',
        data: spendPctData
    });

    // Draw the Quarter spend bar chart
    var qtSpendPoints = GetMetricDataPoints(allDataPoints, "Spend", "Quarter");
    var qtSpendDataPoints = [];
    for (i = 3; i >= 0; i--) {
        if (qtSpendPoints[i]) {
            qtSpendDataPoints.push(qtSpendPoints[i].Value);
        }
    }
    var qtSpendData = {
        datasets: [{
            data: qtSpendDataPoints,
            backgroundColor: [
                'rgba(101, 141, 27, 1)',
                'rgba(0, 76, 151, 1)',
                'rgba(163, 22, 55, 1)',
                'rgba(255, 192, 0, 1)'
            ]
        }],
        labels: [
            'Q1 2016',
            'Q2 2016',
            'Q3 2016',
            'Q4 2016'
        ]
    };
    var qtSpendBarCtx = $("#qtSpendBar");
    var qtSpendBar = new Chart(qtSpendBarCtx, {
        type: 'bar',
        data: qtSpendData
    });

    // Draw the Supplier revenue Pie
    var revValue = GetLatestMetricValue(allDataPoints, "Revenue", "Year");
    $(".supp-rev-number").text(revValue);
    var suppRevPieCtx = $("#suppRevPie");
    var suppRevPie = new Chart(suppRevPieCtx, {
        type: 'pie',
        data: {
            datasets: [
                {
                    data: [0.09, 99.91],
                    backgroundColor: [
                        'rgba(163, 22, 55, 1)',
                        'rgba(200, 200, 200, 1)'
                    ]
                }
            ],
            labels: [
                'Revenue contributed by Astellas IS',
                'Other'
            ]
        }
    });
}

/* End Supplier Page scripts */