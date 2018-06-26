// JavaScript code for Astellas VSM Supplier Scorecard

// Global variables
var supplierSegmentListPath = "";
var datapointCollection;

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

// Datasheet initialization functions

function LoadDatasheetOptions() {
    datasheetUrl = _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/getbytitle('Documents')/items?$select=Modified&$expand=File&$top=50&$orderby=Modified desc";
    $.ajax({
        url: datasheetUrl,
        method: "GET",
        headers: {
            "accept": "application/json;odata=verbose"
        },
        success: function(data) {
            $.each(data.d.results, function(i, ds) {
                if (ds.File.Name.endsWith(".csv")) {
                    $("#datasheetSelect").append("<option value='" + ds.File.ServerRelativeUrl  + "'>" + ds.File.Name + "</option>");
                }
            });
        },
        error: function(err) {
            console.log(JSON.stringify(err));
        }
    });
}

// End datasheet initialization functions

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
    var schemaUrl = "/sites/astellasvsm/supscore/_api/web/lists/getbytitle('Schema')/items?$select=Title,Metric,Group,Period,PeriodType,Format&$top=100";
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

function FormatValue(value, format) {
    var formattedValue;

    switch(format) {
        case "${}":
            formattedValue = parseFloat(value.split(",").join("")).toFixed(2);
            break;
        case "${}M":
            formattedValue = parseFloat(value.split(",").join("")).toFixed(2);
            break;
        case "{0.}":
        case "{0.}%":
            formattedValue = parseInt(value).toString();
            break;
        case "{0.0}":
        case "{0.0}%":
            formattedValue = parseFloat(value).toFixed(1);
            break;
        case "{0.00}":
        case "{0.00}%":
            formattedValue = parseFloat(value).toFixed(2);
            break;
        case "{0.000}":
        case "{0.000}%":
            formattedValue = parseFloat(value).toFixed(3);
            break;
        default: 
            formattedValue = value;
            break;
    }

    return formattedValue;
}

function SaveDataPoint(dp) {
    // Construct data point object
    var dataPoint = {
        '__metadata': {
            'type': 'SP.Data.DatapointsListItem'
        },
        'Title': dp.metric,
        'Period': dp.period,
        'PeriodType': dp.periodType,
        'Group': dp.group,
        'Supplier': dp.supplierId,
        'Valid': (new Date()).toISOString(),
        'Value': dp.value,
        'DataFormat': dp.format,
        'DisplayFormat': dp.format == "${}" ? "${}M" : dp.format,
        'FY': dp.year
    }
    // Check if data point exists by Supplier, Metric, PeriodType, Period and Group
    console.log("Checking " + datapointCollection.length + " data points...");
    if (datapointCollection) {
        var matches = $.grep(datapointCollection, function(p, i) {
            return (p.Title === dp.metric && p.Supplier === dp.supplierId && p.PeriodType === dp.periodType && p.Period === dp.period && p.Group === dp.group);
        });
        if (matches.length > 0) {
            console.log("Match found.");
            // Match found - update
            UpdateDataPoint(matches[0].__metadata.uri, dataPoint);
        }
        else {
            console.log("No match.");
            // No match found - add data point
            AddDataPoint(dataPoint);
        }
    }
    else {
        console.log("Failed to read existing data point information. Please try again.");
    }
}

function AddDataPoint(dp) {
    var dataPointUrl = _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/getbytitle('Datapoints')/items";
    
    $.ajax({
        url: dataPointUrl,
        method: "POST",
        data: JSON.stringify(dp),
        headers: {
            "accept": "application/json;odata=verbose",
            "content-type": "application/json;odata=verbose",
            "X-RequestDigest": $("#__REQUESTDIGEST").val()
        },
        success: function(data) {
            console.log("Added: " + dp.FY + " " + dp.Supplier + " " + dp.Title + " " + dp.PeriodType + " "  + dp.Period + " " + dp.Group);
        },
        error: function(err) {
            console.log("Failed to add: " + dp.FY + " " + dp.Supplier + " " + dp.Title + " " + dp.PeriodType + " " + dp.Period + " " + dp.Group + JSON.stringify(err));
        }
    });
}

function UpdateDataPoint(uri, dp) {
    $.ajax({
        url: uri,
        method: "POST",
        data: JSON.stringify(dp),
        headers: {
            "accept": "application/json;odata=verbose",
            "X-RequestDigest": jQuery("#__REQUESTDIGEST").val(),
            "content-type": "application/json;odata=verbose",
            "X-HTTP-Method": "MERGE",
            "If-Match": "*"
        },
        success: function(data) {
            console.log("Updated: " + dp.FY + " " + dp.Supplier + " " + dp.Title + " " + dp.PeriodType + " "  + dp.Period + " " + dp.Group);
        },
        error: function(err) {
            console.log("Failed to update: " + dp.FY + " " + dp.Supplier + " " + dp.Title + " " + dp.PeriodType + " " + dp.Period + " " + dp.Group + JSON.stringify(err));
        }
    });
}

function GetColumnMap() {
    var columnMapUrl = _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/getbytitle('Column Map')/items";
    return $.ajax({
        url: columnMapUrl,
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
    var columnMap = [];
    var filePath = $("#datasheetUrlHidden").val();
    var currentYear = filePath.substr(filePath.lastIndexOf("_") + 1, 4);
    if (filePath) {
        $.ajax({
            type: "GET",
            url: filePath,
            dataType: "text",
            success: function(data) {
                // Capture all records as objects
                records = $.csv.toObjects(data);

                console.log(records.length + " records found.");
                
                GetColumnMap().done(function(columnData) {
                    $.each(columnData.d.results, function(i, cd){
                        columnMap.push(
                            {
                                "title": cd.Title,
                                "column": cd.Column
                            }
                        )
                    });

                    for (var propertyName in records[0]) {
                        console.log("Finding column for field - " + propertyName);
                        var column = $.grep(columnMap, function(m, i) { return m.title == propertyName });
                        if (column.length > 0) {
                            console.log("Column found - " + column[0].column);
                        }
                        else {
                            console.log("Column NOT found.");
                        }
                    }
                });
                
                // Get all existing data points for the datasheet year
                // RetrieveAllDatapoints(currentYear).done(function(dpData) {
                //     datapointCollection = dpData.d.results;
                //     // Get Supplier data from master table
                //     GetSupplierData().done(function(supplierData) {
                //         GetSchema().done(function(schema) {
                //             // 5 things are needed to add a datapoint
                //             // The first is derived from the Supplier Segment table
                //             var currentSupplierId;
                //             // The rest are obtained from the schema map
                //             var currentMetric;
                //             var currentPeriodType;
                //             var currentPeriod;
                //             var currentGroup;
                //             var currentFormat;
                //             var currentValue;
    
                //             $.each(records, function(i, record) {
                //                 // Check if the supplier is in the supplier segmentation table
                //                 var matches = $.grep(supplierData.d.results, function(s, i) { return s.Title == record["Supplier Name"]; });
                //                 if (matches.length > 0) {
                //                     // Supplier match found
                //                     // TODO: Remove condition after testing for one supplier
                //                     if (record["Supplier Name"] == "IBM") {
                //                         // Set current supplier ID
                //                         currentSupplierId = matches[0].SupplierID;
                //                         // Enumerate properties of record
                //                         for (var prop in record) {
                //                             // Find the corresponding schema entry
                //                             var schemaEntry = $.grep(schema.d.results, function(s, i) { return s.Title == prop });
                //                             if (schemaEntry.length > 0) {
                //                                 // Schema entry found - set required values
                //                                 currentMetric = schemaEntry[0].Metric;
                //                                 currentGroup = schemaEntry[0].Group;
                //                                 currentPeriodType = schemaEntry[0].PeriodType;
                //                                 currentPeriod = schemaEntry[0].Period;
                //                                 currentFormat = schemaEntry[0].Format;
                //                                 currentValue = FormatValue(record[prop], currentFormat);
    
                //                                 // Add or update the data point in the data point list
                //                                 SaveDataPoint({
                //                                     supplierId: currentSupplierId, 
                //                                     metric: currentMetric, 
                //                                     group: currentGroup,
                //                                     periodType: currentPeriodType,
                //                                     period: currentPeriod,
                //                                     value: currentValue,
                //                                     format: currentFormat,
                //                                     year: currentYear
                //                                 });
                //                             }
                //                         }
                //                     }
                //                 }
                //                 else {
                //                     // Supplier match not found - do nothing
                //                 }
                //             });
                //         });
                //     }).fail(function(err) {
                //         console.log(JSON.stringify(err));
                //     });
                // });
            },
            error: function(err) {
                console.log(JSON.stringify(err));
            }
        });
    }
    else {
        alert("Please select a datasheet to load.");
    }
}

// End data load functions

// Shared data retrieval functions

function RetrieveAllDatapoints(currentYear) {
    reqUrl = _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/getbytitle('Datapoints')/items?$select=Title,PeriodType,Period,Valid,Value,DataFormat,DisplayFormat,Supplier,Group,FY&$top=50000&$filter=FY eq '" + currentYear + "'";
    return $.ajax({
        url: reqUrl,
        method: "GET",
        headers: {
            "accept": "application/json;odata=verbose"
        },
        success: function(data) {
        },
        error: function(err) {
            console.log(JSON.stringify(err));
        }
    });
}

function GetAllDataPointsForSupplier(supplier, year) {
    var dataPoints;
    reqUrl = _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/getbytitle('Datapoints')/items?$select=Title,PeriodType,Period,Valid,Value,DataFormat,DisplayFormat,Supplier,Group,FY&$filter=Supplier eq '" + supplier + "' and FY eq '" + year + "'&$top=1000&$orderby=Valid desc";
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

function GetDataPoints(supplier, metric, periodType, period) {
    reqUrl = _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/getbytitle('Datapoints')/items?$select=Title,PeriodType,Period,Valid,Value,DataFormat,DisplayFormat,Supplier,FY&$filter=Supplier eq '" + supplier + "' and Title eq '" + metric + "' and PeriodType eq " + periodType + "' and Period eq '" + period + "'";
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

function GetMetricDataPoints(dataPoints, metric, periodType) {
    var points = $.grep(dataPoints, function(dp, i) {
        return (dp.Title == metric && dp.PeriodType == periodType);
    });
    return points;
}

function GetLatestMetricValue(dataPoints, metric, period) {
    var points = $.grep(dataPoints, function(dp, i) {
        return (dp.Title == metric && dp.Period == period && dp.Group == "ALL");
    });
    if (points.length > 0) {
        return GetFormattedString(points[0].Value, points[0].DisplayFormat);
    }
    else {
        return "";
    }
}

function GetLatestMetricDate(dataPoints, metric, period) {
    var points = $.grep(dataPoints, function(dp, i) {
        return (dp.Title == metric && dp.Period == period);
    });
    if (points.length > 0) {
        points.sort(function(a, b) { return (new Date(a.Valid)) > (new Date(b.Valid))});
        return points[0].Valid;
    }
    else {
        return null;
    }
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

// Shared data formatting functions

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

    // If the format is currency in millions of dollars
    if (format == "${}M") {
        value = (value / 1000000).toFixed(2);
    }

    return prefix + value + suffix;
}

function GetRoundValue(value, decimals) {
    return Number(Math.round(value + 'e'+ decimals) + 'e-' + decimals);
}

// End shared data formatting functions


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
    var allDataPoints = GetAllDataPointsForSupplier(supplierId, '2016'); // TODO: Get year from configuration
    $(".reporting-period").text("Reporting Period: " + moment(GetLatestMetricDate(allDataPoints, "Health", "Year")).format("MMM-YYYY"));
    $(".vendor-health").text("Overall Supplier Health: " + GetLatestMetricValue(allDataPoints, "Health", "Year"));

    // Populate year spend
    $(".year-spend-number").text((allDataPoints, "Spend", "Year"));

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
    var qtSpendLabels = [];
    $.each(qtSpendPoints, function(i, pt) {
        qtSpendDataPoints.push(GetRoundValue(pt.Value / 1000000, 2));
        qtSpendLabels.push(pt.Period);
    });
    var qtSpendData = {
        datasets: [{
            label: "Quarterly Spend",
            data: qtSpendDataPoints,
            "fill": false,
            backgroundColor: [
                'rgba(101, 141, 27, 0.2)',
                'rgba(0, 76, 151, 0.2)',
                'rgba(163, 22, 55, 0.2)',
                'rgba(255, 192, 0, 0.2)'
            ],
            borderColor: [
                'rgba(101, 141, 27, 1)',
                'rgba(0, 76, 151, 1)',
                'rgba(163, 22, 55, 1)',
                'rgba(255, 192, 0, 1)'
            ],
            borderWidth: 1
        }],
        labels: qtSpendLabels
    };
    var qtSpendBarCtx = $("#qtSpendBar");
    var qtSpendBar = new Chart(qtSpendBarCtx, {
        type: 'bar',
        data: qtSpendData,
        options: {
            legend: {
                display: false
            },
            scales: {
                xAxes: [{
                    time: {
                        unit: 'quarter'
                    }
                }],
                yAxes: [
                    {
                        ticks: {
                            "beginAtZero": true
                        }
                    }
                ]
            }
        }
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
                'Astellas IS',
                'Other'
            ]
        },
        options: {
            legend: {
                display: false
            }
        }
    });
}

/* End Supplier Page scripts */