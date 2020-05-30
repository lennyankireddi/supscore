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
    configUrl = _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/getbytitle('Configuration')/items?$filter=Title eq '" + key + "'&$select=Title,Value1&$top=1";
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

function GenerateId() {
    return (new Date()).format("yyyyMMddhhmmssfff");
}

function GetSpendPieColor(num) {
    switch(num) {
        case 0: return "rgba(0, 76, 151, 1)";
        case 1: return "rgba(200, 200, 200, 1)";
    }
}

function GetSupRevColor(num) {
    switch(num) {
        case 0: return "rgba(217, 30, 73, 1)";
        case 1: return "rgba(200, 200, 200, 1)";
    }
}

function GetQuarterColor(num) {
    switch(num) {
        case 0: return "#658D1B";
        case 1: return "#004C97";
        case 2: return "#A31637";
        case 3: return "#FFC000";
    }
}
// End shared utility functions



// Shared data formatting functions

function GetFormattedString(value, format) {
    var prefix = format.substring(0, format.indexOf("{"));
    var suffix = format.substring(format.indexOf("}") + 1);
    var formatString = format.substring(format.indexOf("{") + 1, format.indexOf("}"));

    // If the format is currency in millions of dollars
    if (prefix == "$" && suffix == "M") {
        value = (value / 1000000).toFixed(2);
    }

    // If the format needs to be a number
    if (formatString.indexOf("0.") > -1) {
        // Find number of decimal places
        var decimals = formatString.substring(formatString.indexOf(".") + 1).length;
        return "<span class='value-prefix'>" + prefix + "</span><span class='metric-value'>" + parseFloat(value).toFixed(decimals) + "</span><span class='value-suffix'>" + suffix + "</span>";
    }

    return "<span class='value-prefix'>" + prefix + "</span><span class='metric-value'>" + value + "</span><span class='value-suffix'>" + suffix + "</span>";
}

function GetRoundValue(value, decimals) {
    return Number(Math.round(value + 'e'+ decimals) + 'e-' + decimals);
}

// End shared data formatting functions

// Shared data retrieval functions

function GetMetrics() {
    metricsUrl = _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/getbytitle('Metrics')/items?$select=Title,DisplayTitle,Columns,DataFormat,DisplayFormat&$top=1000";
    return $.ajax({
        url: metricsUrl,
        method: "GET",
        headers: {
            "accept": "application/json;odata=verbose"
        }
    });
}

function GetMetric(metrics, title) {
    var metric = $.grep(metrics, function(m, i) { return m.Title == title; });
    if (metric.length > 0) { return metric[0] }
    else { return null }
}

function GetHealthDisplay(health) {
    if (!health) {
        return "<img src='/teams/gsvm/supmgmt/SiteAssets/images/frown_off.png' class='health-indicator'>" +
                "<img src='/teams/gsvm/supmgmt/SiteAssets/images/meh_off.png' class='health-indicator'>" +
                "<img src='/teams/gsvm/supmgmt/SiteAssets/images/smile_off.png' class='health-indicator'>";
    }
    switch(health.toLowerCase()) {
        case "poor": return "<img src='/teams/gsvm/supmgmt/SiteAssets/images/frown_on.png' class='health-indicator'>" +
                            "<img src='/teams/gsvm/supmgmt/SiteAssets/images/meh_off.png' class='health-indicator'>" +
                            "<img src='/teams/gsvm/supmgmt/SiteAssets/images/smile_off.png' class='health-indicator'>";
        case "good": return "<img src='/teams/gsvm/supmgmt/SiteAssets/images/frown_off.png' class='health-indicator'>" +
                            "<img src='/teams/gsvm/supmgmt/SiteAssets/images/meh_on.png' class='health-indicator'>" +
                            "<img src='/teams/gsvm/supmgmt/SiteAssets/images/smile_off.png' class='health-indicator'>";
        case "excellent": return "<img src='/teams/gsvm/supmgmt/SiteAssets/images/frown_off.png' class='health-indicator'>" +
                            "<img src='/teams/gsvm/supmgmt/SiteAssets/images/meh_off.png' class='health-indicator'>" +
                            "<img src='/teams/gsvm/supmgmt/SiteAssets/images/smile_on.png' class='health-indicator'>";
        default: return "<img src='/teams/gsvm/supmgmt/SiteAssets/images/frown_off.png' class='health-indicator'>" +
                        "<img src='/teams/gsvm/supmgmt/SiteAssets/images/meh_off.png' class='health-indicator'>" +
                        "<img src='/teams/gsvm/supmgmt/SiteAssets/images/smile_off.png' class='health-indicator'>";
    }
}

function GetSupplierCategory(catHW, catSvc, catSW, catOth) {
    var categories = []
    if (catHW) { categories.push("Hardware") };
    if (catSvc) { categories.push("Services") };
    if (catSW) { categories.push("Software") };
    if (catOth) { categories.push("Other") };
    return categories.toString();
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
    if (!health) {
        return "<img src='/teams/gsvm/supmgmt/SiteAssets/images/frownoff.png' class='sentiment-icon'>" +
                    "<img src='/teams/gsvm/supmgmt/SiteAssets/images/mehoff.png' class='sentiment-icon'>" +
                    "<img src='/teams/gsvm/supmgmt/SiteAssets/images/smileoff.png' class='sentiment-icon'>";
    }
    switch(health.toLowerCase()) {
        case "excellent": return "<img src='/teams/gsvm/supmgmt/SiteAssets/images/frownoff.png' class='sentiment-icon'>" +
                            "<img src='/teams/gsvm/supmgmt/SiteAssets/images/mehoff.png' class='sentiment-icon'>" +
                            "<img src='/teams/gsvm/supmgmt/SiteAssets/images/smileon.png' class='sentiment-icon'>";
        case "good": return "<img src='/teams/gsvm/supmgmt/SiteAssets/images/frownoff.png' class='sentiment-icon'>" +
                            "<img src='/teams/gsvm/supmgmt/SiteAssets/images/mehon.png' class='sentiment-icon'>" +
                            "<img src='/teams/gsvm/supmgmt/SiteAssets/images/smileoff.png' class='sentiment-icon'>";
        case "poor": return "<img src='/teams/gsvm/supmgmt/SiteAssets/images/frownon.png' class='sentiment-icon'>" +
                            "<img src='/teams/gsvm/supmgmt/SiteAssets/images/mehoff.png' class='sentiment-icon'>" +
                            "<img src='/teams/gsvm/supmgmt/SiteAssets/images/smileoff.png' class='sentiment-icon'>";
        default: return "<img src='/teams/gsvm/supmgmt/SiteAssets/images/frownoff.png' class='sentiment-icon'>" +
                            "<img src='/teams/gsvm/supmgmt/SiteAssets/images/mehoff.png' class='sentiment-icon'>" +
                            "<img src='/teams/gsvm/supmgmt/SiteAssets/images/smileoff.png' class='sentiment-icon'>";
    }
}

function PopulateVendorList() {
    $("#vendorTableBody").append("<tr><td><i class='fa fa-spinner fa-pulse'></i>&nbsp;Loading supplier data...</td></tr>");
    var year = GetQueryStringParameter("yr");
    if (!year) {
        year = GetConfigurationValue("ActiveYear");
        if (!year) {
            year = (new Date()).getFullYear() - 1;
        }
    }
    var cySupplierDataUrl = _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/getbytitle('IS Supplier Data')/items?$select=Title,SupplierID,PurchasingRegionAssignment,CYAssignedSegment,CatSW,CatOth,CatHW,CatSvc,TotalSpend,CSATEndOfYear,OverallHealthIndicator&$filter=Year eq '" + year.toString() + "'&$top=1000";
    var pySupplierDataUrl = _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/getbytitle('IS Supplier Data')/items?$select=Title,SupplierID,PurchasingRegionAssignment,CYAssignedSegment,CatSW,CatOth,CatHW,CatSvc,TotalSpend,CSATEndOfYear,OverallHealthIndicator&$filter=Year eq '" + (year - 1).toString() + "'&$top=1000";
    $.ajax({
        url: cySupplierDataUrl,
        method: "GET",
        headers: {
            "accept": "application/json;odata=verbose"
        },
        success: function(data) {
            var pyData;
            $("#vendorTableBody").empty();
            $.ajax({
                url: pySupplierDataUrl,
                method: "GET",
                headers: {
                    "accept": "application/json;odata=verbose"
                },
                async: false,
                success: function(data) {
                    pyData = data.d.results;
                },
                error: function(err) {
                    console.log(JSON.stringify(err));
                }
            });
            $.each(data.d.results, function(i, item) {
                // Get Spend for prior year
                var priorYearSpend = "0";
                var pyRecord = $.grep(pyData, function (rec, i) {
                    return rec.Title == item.Title;
                });
                if (pyRecord.length > 0) {
                    priorYearSpend = GetRoundValue(pyRecord[0].TotalSpend / 1000000, 3);
                }

                // Get current year spend
                var currentYearSpend = "";
                if (item.TotalSpend != null) {
                    currentYearSpend = GetRoundValue(item.TotalSpend / 1000000, 3);
                }

                // Get current year CSAT
                var csat = "";
                if (item.CSATEndOfYear != null) {
                    csat = item.CSATEndOfYear;
                }

                // Add the row for this supplier to the table
                // if segment other than transactional
                if (item.CYAssignedSegment != "IS Transactional Supplier") {
                    $("#vendorTableBody").append(
                        "<tr>" +
                            "<td><a href='Supplier.aspx?id=" + item.SupplierID + "'>" + item.Title + "</a></td>" +
                            "<td>" + item.PurchasingRegionAssignment.replace(" Regional", "") + "</td>" +
                            "<td>" + GetSegmentText(item.CYAssignedSegment) + "</td>" +
                            "<td>" + GetServiceCategories(item.CatSW, item.CatHW, item.CatSvc, item.CatOth) + "</td>" +
                            "<td align='center'>" + priorYearSpend + "</td>" +
                            "<td align='center'>" + currentYearSpend + "</td>" +
                            "<td align='center'>" + csat + "</td>" +
                            "<td align='center'>" + GetSentiment(item.OverallHealthIndicator) + "</td>" +
                        "</tr>"
                    );
                }
            });
            $("#vendorTable").DataTable({
                "paging": false,
                "searching": true,
                "info": false,
                "order": [
                    [2, 'desc'],
                    [0, 'asc']
                ]
            });
        },
        error: function(err) {
            console.log(JSON.stringify(err));
        }
    });
}

// End Vendor List table functions

/* Supplier Page scripts */

function GetSupplierRecord(supplierId, year) {
    var supplierDataUrl = _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/getbytitle('IS Supplier Data')/items?$filter=SupplierID eq '" + supplierId + "' and Year eq '" + year + "'&$top=1";
    return $.ajax({
        url: supplierDataUrl,
        method: "GET",
        headers: {
            "accept": "application/json;odata=verbose"
        }
    });
}

/* End Supplier Page scripts */

// Datasheet initialization functions

function LoadDatasheetOptions() {
    datasheetUrl = _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/getbytitle('Data Files')/items?$select=Modified,File&$expand=File&$top=50&$orderby=Modified desc";
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