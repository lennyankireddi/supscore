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