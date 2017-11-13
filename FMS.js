  window.GLOBAL = {};
  GLOBAL.cost = "COST";
  GLOBAL.approv = "APPROVISIONNEMENT";
  GLOBAL.dashb = [];
  GLOBAL.histo = [];
  GLOBAL.invest = [];
  GLOBAL.dummy = "XXXXXX";
  GLOBAL.error = {msg:null,isWarning:false};
  
  /**
   * Run initializations on web app load.
   */
  $(function() 
  {
    jQuery.fx.off = false;
    updateAllValues(false);
    
    $(document).keyup(onKeyUp);  // The event listener for the key press (action buttons)
  });

  function updateAllValues(shouldRefresh)
  {
    showLoader(shouldRefresh);
    
    google.script.run
                 .withSuccessHandler(function(contents) {
                   if (shouldRefresh)
                   {
                     updateValue(3, false, contents);
                     updateValue(2, false, contents);
                     updateValue(1, true, contents);
                     updateValue(4, false, contents);
                   }
                   
                   updateDashboardTable(contents);
                   
                   updateInvestmentValues();
                 })
                 .withFailureHandler(displayError)
                 .getSheetValues("Dashboard!A:B");
  }

  function updateInvestmentValues()
  {
    google.script.run
                 .withSuccessHandler(function(contents) {
                   updateInvestmentTable(contents);
                   
                   updateHistoricValues();
                 })
                 .withFailureHandler(displayError)
                 .getSheetValues("Investment!D:V");
  }

  function updateHistoricValues()
  {
    google.script.run
                 .withSuccessHandler(function(contents) {
                   updateHistoricTable(contents);

                   $("input").each(function() 
                   {
                     if ($(this).hasClass("auto"))
                     {
                       autoAdaptWidth(this);
                     }
                   });

                   hideLoader();
                   
                   if (GLOBAL.error.msg) {
                     displayError(GLOBAL.error.msg, GLOBAL.error.isWarning);
                     GLOBAL.error.msg = null;
                     GLOBAL.error.isWarning = false;
                   }
                 })
                 .withFailureHandler(displayError)
                 .getSheetValues("Historic!A:H");
  }
  
  function addTransaction()
  {
    $('#actionButton').hide("fade", null, 500, function() 
    { $('#addTransactionForm').show("fade", null, 500, function()
    { $('#transactionName').focus(); }); });
  }

  function deleteTransaction()
  {
    $('#actionButton').hide("fade", null, 500, function() 
    { $('#deleteTransactionForm').show("fade", null, 500); });
  }
  
  function uploadAccountFile()
  {
    $('#actionButton').hide("fade", null, 500, function() 
    { $('#uploadFileForm').show("fade", null, 500, function()
    { $('#fileUpload').focus(); }); });
  }
  
  function validateAddForm()
  {    
//    var today = new Date();
//    var dd = today.getDate();
//    var mm = today.getMonth()+1; //January is 0!
//    var yyyy = today.getFullYear();
//    dd = dd<10 ? '0' + dd : dd;
//    mm = mm<10 ? '0' + mm : mm;
//    var tDate = mm + '/' + dd + '/' + yyyy;
    var tDate = GLOBAL.dummy;

    var tName = $("#transactionName").children(":selected").attr("id");

    var type = $("#transactionName").prop("value")
    var tType = tName ? type : "";
    
    var qty = parseInt($("#transactionQuantity").val(), 10);
    var tQty = tName && !isNaN(qty) && qty != 0 ? qty : "";

    var tOpe = !tName ? type
             : tQty<0 ? "SELL"
             : tQty>0 ? "BUY"
             : "DIVIDEND";
    
    var val = parseFloat($("#transactionValue").val());
    var tVal = !isNaN(val) && val != 0 ? val : "";

    var tUnit = tQty && tVal && tName ? -tVal/tQty : "";

    var errorMsg = tQty && isNaN(tQty) ? "Quantity should be an Integer."
                 : tVal && isNaN(tVal) ? "Value should be a Number."
                 : tName && !tQty && (!tVal || tVal<=0) ? "Coupon value should be positive."
                 : !tName && !tVal ? "Approvisionnement/Cost Value should be set."
                 : tQty && !tVal ? "The Value should be set if the Quantity is set."
                 : tUnit && tUnit<0 ? "Quantity should have an opposite sign as Value."
                 : "";

    if (!errorMsg)
    {
      insertHistoricRow([[tDate, tType, tName, tOpe, tQty, tUnit, tVal, tName + "@" + tOpe + "@" + tQty + "@" + tVal]]);
    }
    else
    {
      displayError(errorMsg, true);
    }
  }

  function insertHistoricRow(data)
  {
    var index = 1;
    var rowCnt = data.length;
    
    if (rowCnt > 0) {
      $("#snackbar").text((rowCnt == 1 ? "Transaction" : rowCnt + " Transactions") + " added");
    
      showLoader(true);
      
      google.script.run
                   //.withSuccessHandler(function(contents) { setValue("Historic!A2", data, sortTransactionValues) })
                   .withSuccessHandler(function(contents) { setValue("Historic!A2", data, executionSuccess) })
                   .withFailureHandler(displayError)
                   .insertRows(9, data, {startRow:index, endCol:11});
    } else {
      displayError("No transaction added.", true);
    }
  }
  
  function sortTransactionValues()
  {
    google.script.run
                 .withSuccessHandler(function(contents) { executionSuccess(); })
                 .withFailureHandler(displayError)
                 .sortColumn(9, 0, true);
  }

  function validateDeleteForm(index, rowCnt)
  {
    var index = index ? index : indexOf(GLOBAL.histo, GLOBAL.dummy, 0);
    var rowCnt = rowCnt ? rowCnt : 1;
    
    if (index*rowCnt > 0) {
      $("#snackbar").text((rowCnt == 1 ? "Transaction" : rowCnt + " Transactions") + " deleted");
    
      showLoader(true);
    
      google.script.run
                   .withSuccessHandler(function(contents) { executionSuccess(); })
                   .withFailureHandler(displayError)
                   .deleteRows(9, index, index + rowCnt);
    } else {
      displayError("No transaction deleted.", true);
    }
  }
  
  function validateUploadForm()
  {
    showLoader(true);
    
    var data = null;
    var file = $("#fileUpload").prop("files")[0];
    if (file)
    {
      var reader = new FileReader();
      reader.readAsText(file);
      reader.onload = function(event) {
        var csvData = event.target.result;
        try {
          data = $.csv.toArrays(csvData);
      
          if (data && data.length > 1) 
          {
            google.script.run
                  .withSuccessHandler(function(contents) {
                    setValue("Account!A1", data);
                    
                    $("#snackbar").text(data.length-1 + " rows imported from csv file");  // Don't count the header
                    showSnackBar();
                    
                    compareResultData();
                  })
                  .withFailureHandler(displayError)
                  .clearSheetValues("Account!A:J");
          } else {
            displayError("No data to import: the file is empty.", true);
          }
        }
        catch (err) {
          displayError("The file has an incorrect data type (should be csv).");
        }
      };
      reader.onerror = function() { displayError("Unable to read the file."); };
    } else {
      displayError("No file had been selected.", true);
    }
  }
  toto
  function compareResultData()
  {
    google.script.run
                 .withSuccessHandler(function(contents) {
                   if (contents.length > 1) {
                     var dupCnt = 0;
                     var errCnt = 0;
                     var data = [];
                     for (var i = contents.length - 1; i > 0; --i) {   // Don't insert the header
                       var index = indexOf(GLOBAL.histo, contents[i][7], 7);
                       debugger;
                       if (!index) {
                         if (!indexOf(contents[i], "#N/A")) {
                           data.push(contents[i]);
                         } else {
                           ++errCnt;
                         }
                       } else {
                         //if (contents[i][0] != toDate(GLOBAL.histo[index][0])) {
                         if (!toDate(GLOBAL.histo[index][0])) {
                           if (!indexOf(contents[i], "#N/A")) {
                             data.push(contents[i]);      // Add the new value instead
                             validateDeleteForm(index);   // Remove duplicate
                           } else {
                             ++errCnt;
                           }
                         } else {
                           ++dupCnt;
                         }
                       }
                     }
                   
                     if (dupCnt + errCnt != contents.length - 1) {
                       insertHistoricRow(data);
                       debugger;
                       if (dupCnt > 0) {
// TODO
//                         GLOBAL.error.msg = dupCnt + " duplicate(s) found, " + (contents.length - 1 - dupCnt) + " row(s) added.";
//                         GLOBAL.error.isWarning = true;
                         var msg = errCnt == 0
                             ? dupCnt + " duplicate(s) found, " + (contents.length - 1 - dupCnt) + " row(s) added."
                             : dupCnt + " duplicate(s) found, " + (contents.length - 1 - dupCnt - errCnt) + " row(s) added and " + errCnt + " row(s) in error.";
                         displayError(msg, errCnt == 0);
                       }
                     } else {
                       var msg = errCnt == 0 
                           ? "The imported file contains only duplicates (" + dupCnt + " found)."
                           : dupCnt + " duplicate(s) found and " + errCnt + " row(s) in error.";
                       displayError(msg, errCnt == 0);
                     }
                   } else {
                     compareResultData();
                   }
                 })
                 .withFailureHandler(displayError)
                 .getSheetValues("Result!A:H");
  }
  
  function cancelForm()
  {
    if ($('#addTransactionForm').is(":visible"))
    {
      $('#addTransactionForm').hide("fade", null, 500, function() 
      { $('#actionButton').show("fade", null, 500); 
        selectName($('#transactionName').get(0), 0);
        $('#transactionQuantity').val("");
        $('#transactionValue').val(""); });
    }
    else if ($('#deleteTransactionForm').is(":visible"))
    {
      $('#deleteTransactionForm').hide("fade", null, 500, function() 
      { $('#actionButton').show("fade", null, 500); });
    }
    else if ($('#uploadFileForm').is(":visible"))
    {
      $('#uploadFileForm').hide("fade", null, 500, function() 
      { $('#actionButton').show("fade", null, 500); 
        $('#fileUpload').val("")});
    }

    $('#mainFocus').focus();
  }

  function onKeyUp(e)
  {
    if (!$('#addTransactionForm').is(":animated") 
     && !$('#deleteTransactionForm').is(":animated") 
     && !$('#uploadFileForm').is(":animated") 
     && !$('#actionButton').is(":animated")
     && !$('#loaderOverlay').is(':visible'))
    {    
      if ($('#alertOverlay').is(':visible'))
      {
        $('#alertOverlay').fadeOut(1000);
      }
      else if (!$('#actionButton').is(':visible'))
      {
        if (e.keyCode === 13) // Enter
        {
          if ($('#addTransactionForm').is(':visible'))
          {
            validateAddForm();
          }
          else if ($('#deleteTransactionForm').is(':visible'))
          {
            validateDeleteForm();
          }
          else if ($('#uploadFileForm').is(':visible'))
          {
            validateUploadForm();
          }
        }
        else if(e.keyCode === 27) // Esc
        {
          cancelForm();
        }
      }
      else 
      {
        if (!$('input[type="number"]').is(':focus') && !$('input[type="text"]').is(':focus'))// && $('#actionButton').is(':visible'))
        {
          if(e.keyCode === 107 || e.keyCode === 187) // +
          {
            addTransaction();
          }
          else if(e.keyCode === 109 || e.keyCode === 189) // -
          {
            deleteTransaction();
          }
          else if(e.keyCode === 85) // U
          {
            uploadAccountFile();
          }
          else if(e.keyCode === 82) // R
          {
            updateAllValues(true);
          }
        }
      }
    }
  }

  function addTransactionName(id, name)
  {
    var e = document.getElementById("transactionName");
    var option = document.createElement("option");
    option.id = id;
    option.text = name;
    e.add(option);
  }

  function clearTransactionName()
  {
    var e = document.getElementById("transactionName");
    while (e.options.length != 0)
    {
      e.remove(0);
    }
  }

  function updateDashboardTable(contents) 
  {
    GLOBAL.dashb = contents;
    
    google.script.run
                 .withSuccessHandler(function(contents) {
                     var dashboardTableHTML = "";
                     dashboardTableHTML += '<table>';
                     dashboardTableHTML += getTableTitle(contents[0][0], "Settings!A1");
                     dashboardTableHTML += '<tr>';
                     for(var item of contents[1])
                     {
                       dashboardTableHTML+= item != 21 
                                          ? getTableEditableCell(GLOBAL.dashb, item, "Dashboard!B" + item, item == 18 ? 200000 : 2000)
                                          : getTableReadOnlyCell(GLOBAL.dashb, item);
                     }
                     dashboardTableHTML += '</tr>';
                     
                     dashboardTableHTML += getTableTitle(contents[0][1], "Settings!B1");
                     dashboardTableHTML += '<tr>';
                     for(var item of contents[2])
                     {
                       dashboardTableHTML += item == 16 
                                           ? getTableEditableCell(GLOBAL.dashb, item, "Expenses!C2", 2000)
                                           : getTableReadOnlyCell(GLOBAL.dashb, item);    
                     }
                     dashboardTableHTML += '</tr>';
                     
                     dashboardTableHTML += getTableTitle(contents[0][2], "Settings!C1");
                     dashboardTableHTML += '<tr>';
                     for(var item of contents[3])
                     {
                       dashboardTableHTML += getTableReadOnlyCell(GLOBAL.dashb, item);    
                     }
                     dashboardTableHTML += '</tr>';
                     
                     dashboardTableHTML += getTableTitle(contents[0][3], "Settings!D1");
                     dashboardTableHTML += '<tr>';
                     for(var item of contents[4])
                     {
                       dashboardTableHTML += getTableReadOnlyCell(GLOBAL.dashb, item);    
                     }
                     dashboardTableHTML += '</tr>';
                     
                     dashboardTableHTML += getTableTitle(contents[0][4], "Settings!E1");
                     dashboardTableHTML += '<tr>';
                     for(var item of contents[5])
                     {
                       dashboardTableHTML += getTableReadOnlyCell(GLOBAL.dashb, item);    
                     }
                     dashboardTableHTML += '</tr>';
                     
                     dashboardTableHTML += '</table>';
                     
                     $("#dashboardDiv").prop("innerHTML", dashboardTableHTML);
                 })
                 .withFailureHandler(displayError)
                 .getSheetValues("Settings!A:E");
  }
  
  function updateInvestmentTable(contents) 
  {
    GLOBAL.invest = contents;
  
    clearTransactionName();

    var investmentTableHTML = "";
    investmentTableHTML += '<table><tr style="background-color:white"><td><table style="border:0px;padding:0px;width:auto">'
                         + '<tr style="background-color:white;"><td><h2>Investment</h2></td>'
                         + '<td><div class="tooltip"><label class="switch" style="border:30px;margin:7px 0px 0px 0px;">'
                         + '<input type="checkbox" onclick="filterRebalance(this.checked)">'
                         + '<div class="slider round"></div></label><span class="tooltiptext">Rebalance</span></div></td></tr></table>'
                         + '<td colspan="' + (contents[0].length-1) + '" align="right">' 
                         + '<input id="searchInput" type="text" placeholder="Search"'
                         + 'onkeyup="searchTable(this, \'investmentTable\', 0)" ></tr></table>';
    investmentTableHTML += '<table id="investmentTable" class="sortable">';

    for (var i = 0; i < contents.length; ++i) 
    {
      investmentTableHTML += i==0 ? '<thead>' : '';
      investmentTableHTML += '<tr>';
      //for (var j = 0; j < contents[i].length; ++j)
      for(var j of [1, 5, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18])   // Select only the interesting columns
      {
        investmentTableHTML += getTableReadOnlyContent(contents[i][j], i == 0);
      }
      investmentTableHTML += '</tr>';
      investmentTableHTML += i==0 ? '</thead><tbody>' 
      : i==contents.length-2 ? '</tbody><tfoot>'
      : i==contents.length-1 ? '</tfoot>' : '';
      
      if (i != 0 && i != contents.length-1)
      {
        addTransactionName(contents[i][0], contents[i][1]);
      }
    }
    investmentTableHTML += '</table>';

    $("#investmentDiv").prop("innerHTML", investmentTableHTML);
    sorttable.makeSortable($("#investmentTable").get(0));

    addTransactionName("", GLOBAL.cost);
    addTransactionName("", GLOBAL.approv); 
  }

  function updateHistoricTable(contents) 
  {  
    GLOBAL.histo = contents;

    var historicTableHTML = "";
    historicTableHTML += '<table><tr style="background-color:white"><td><table style="border:0px;padding:0px;width:auto">'
                         + '<tr style="background-color:white;"><td><h2>Historic</h2></td>'
                         + '<td><div class="tooltip"><label class="switch" style="border:30px;margin:7px 0px 0px 0px;">'
                         + '<input type="checkbox" onclick="showAllHistoric(this.checked)">'
                         + '<div class="slider round"></div></label><span class="tooltiptext">Show all</span></div></td></tr></table>'
                         + '<div id="historicLimit" class="hidden"></div>'
                         + '<td colspan="' + (contents[0].length-1) + '" align="right">' 
                         + '<input id="searchInput" type="text" placeholder="Search"'
                         + 'onkeyup="searchTable(this, \'historicTable\', 1, $(\'#historicLimit\').val())"></tr></table>';
    historicTableHTML += '<table id="historicTable" class="sortable">';
    for (var i = 0; i < contents.length; ++i) 
    {
      historicTableHTML += i==0 ? '<thead>' : '';
      historicTableHTML += '<tr>';
      for (var j = 0; j < contents[i].length - 1; ++j)   // Don't display the ID
      {
        historicTableHTML += getTableReadOnlyContent(contents[i][j], i == 0);
      }
      historicTableHTML += '</tr>';
      historicTableHTML += i==0 ? '</thead><tbody>' 
      : i==contents.length-1 ? '</tbody>' : '';
    }
    historicTableHTML += '</table>';

    $("#historicDiv").prop("innerHTML", historicTableHTML);
    sorttable.makeSortable($("#historicTable").get(0));
    
    showAllHistoric(false);
  }

  function getTableEditableCell(contents, index, rangeName, limit)
  {
    return getTableReadOnlyContent(contents[index-1][0], false) + 
           getTableEditableContent(contents[index-1][1], rangeName, limit);
  }

  function getTableReadOnlyCell(contents, index)
  {
    return getTableReadOnlyContent(contents[index-1][0], false) + 
           getTableReadOnlyContent(contents[index-1][1], false);
  }

  function getTableReadOnlyContent(content, isHeader)
  {
    return isHeader ? '<th align="center">' + content + '</th>'
                    : '<td align="center">' + content + '</td>';
  }

  function getTableEditableContent(content, rangeName, limit)
  {
    return '<td align="center"><input class="auto" min="-' + limit + '" max="' + limit + '"'
            + ' oninput="autoAdaptWidth(this);setValue(\'' + rangeName + '\', [[this.value]])"'
            + ' style="border:0px;width:100px;min-width:15px;" type="number" value="'
            + this.toValue(content) + '">€</input></td>';
  }

  function getTableTitle(title, rangeName)
  {
    return '<tr><td colspan="10"><input type="text"'
            + ' oninput=";setValue(\'' + rangeName + '\', [[this.value]])"'
            + ' style="border:0px;min-width:55px;font-size:21px;line-height:33px;color:#b1b1b1;margin:6px;"'
            + ' value="' + title + '"></input></td></tr>';
  }

  function autoAdaptWidth(e)
  {
    var step = 7.23;
    var index = 10;
    var precision = 2;
    var maxLength = Math.max(String(e.min).length, String(e.max).length) + precision;
      
    var val = parseFloat(e.value);
    if (!isNaN(val))
    {
      if (val > e.max)
      {
        e.value = e.max;
      }
      else if (val < e.min)
      {
        e.value = e.min;
      }
      else if (val * 100 % 1 !== 0 || String(e.value).length > maxLength)
      {
        e.value = val.toFixed(precision);
      }

      e.style = "border-color:transparent";
      e.style.width = Math.ceil(Math.max(String(e.value).length, 1) * step + index) + "px";
     }
    else
    {
      e.style = !e.placeholder || e.value != ""
              ? "border-color:red" 
              : "border-color:transparent";
    }
  }
  
  function selectName(e, index)
  {
    if (index !== undefined)
    {
      $('#transactionName').prop("selectedIndex", index);
    }
    else
    {    
      index = e.selectedIndex;
    }
      
    if (e.options[index].id)
    {
      $("#transactionQuantityLabel").fadeIn();
    }
    else
    {
      $("#transactionQuantityLabel").fadeOut();
    }
  }

  function updateValue(row, isPercent, contents)
  {
    var col = 1;
    var index = contents.length - 4;
    var a = toValue(contents[row-1][col]);
    var ax = toValue(contents[row-1 + index][col]);
    var ar = isPercent ? (a + ax) / 100 : a + ax;

    setValue("Dashboard!B" + row, [[ar]]);
  }

  function setValue(name, value, func) 
  {
    google.script.run
                 .withSuccessHandler(function(contents) { if (func) { func(); } })
                 .withFailureHandler(displayError)
                 .setSheetValues(name, value);
  }
    
  function filterRebalance(isChecked)
  {
    // Loop through all table rows, and hide those who don't match the search query
    $("#investmentTable tbody tr").each(function(i) 
    {
      var td = $(this).children("td")[4];
      if (!isChecked || (td && td.innerHTML != 0))
      {
        $(this).show();
      }
      else
      {
        $(this).hide();
      }
    });
  }

  function showAllHistoric(isChecked)
  {
    $("#historicLimit").val(isChecked ? null : "10");
          
    // Loop through all table rows, and hide those who don't match the search query
    $("#historicTable tr").each(function(i) 
    {
      if (isChecked || i <= $("#historicLimit").val())
      {
        $(this).show();
      }
      else
      {
        $(this).hide();
      }
    });
  }

  function searchTable(searchElement, tableName, index, limit) 
  {
    var filter = searchElement.value.toUpperCase();
    var max = limit ? parseInt(limit) : null;

    $("#" + tableName + " tbody tr").each(function(i) 
    {
      var td = $(this).children("td")[index];
      if ((!max || i < max) && td && td.innerHTML.toUpperCase().indexOf(filter) > -1)
      {
        $(this).show();
      }
      else
      {
        $(this).hide();
      }
    });
  }
  
  function showSnackBar() 
  {
    if ($("#snackbar").text())
    {
      $("#snackbar").addClass("show");

      // After 3 seconds, remove the show class from DIV
      setTimeout(function(){ $("#snackbar").removeClass("show"); $("#snackbar").text(""); }, 3000);
    }
  }
   
  function showLoader(isRefreshing)
  {
    $('#loaderOverlay').fadeIn(1000);
    $('#content').fadeTo(1000, isRefreshing ? 0.3 : 0);
    $('#menu').fadeTo(1000, isRefreshing ? 0.3 : 0);
  }

  function hideLoader()
  {
    $('#loaderOverlay').fadeOut(1000);
    $('#content').fadeTo(1000, 1);
    $('#menu').fadeTo(1000, 1);
  }
  
  function executionSuccess()
  {
    updateAllValues(true);
    cancelForm();
    showSnackBar();
  }

  function displayError(msg, isWarning)
  {    
    hideLoader();

    $("#alert").css("background-color", isWarning ? "#ff9800" : "#f44336");
    $("#alert").prop("innerHTML", '<span class="closebtn" onclick="$(\'#alertOverlay\').fadeOut(1000);$(\'#transactionName\').focus();">&times;</span>'
                                + '<strong>' + (isWarning ? "WARNING" : "ALERT") + ':</strong> ' + msg);
    $('#alertOverlay').fadeIn(1000);
  }
  
  function toValue(content)
  {
    return parseFloat(String(content).replace(",", "").replace(" ", ""));
  }
  
  function toDate(content)
  {
    return content && content.split("/").length == 3
         ? content.replace(/(^|\/)0+/g, "$1").split("/")[1] + "/"
         + content.replace(/(^|\/)0+/g, "$1").split("/")[0] + "/"
         + content.split("/")[2]
         : null;
  }
  
  function indexOf(array, value, index)
  {
    var index = index >= 0 ? index : null;
  
    var i;
    if (Array.isArray(array)) {
      var x = 0;
      while(x < array.length 
         && ((index == null && array[x] != value)
          || (index != null && array[x][index] != value))) { ++x; }
         
      i = x < array.length ? x : null;
    }
    
    return i;
  }