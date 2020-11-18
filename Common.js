/**
* Functions that are shared between main app and associate app.
*/

window.GLOBAL = {};
GLOBAL.data = [];
GLOBAL.loadingQueueCount = 0;
GLOBAL.hasAlreadyUpdated = [];
GLOBAL.currentLoadingId;
GLOBAL.currentDisplayedId;
GLOBAL.displayId;

function init() {
  jQuery.fx.off = false;  // if false, display jQuery viesual effect like "fade"

  displayElement('.contentOverlay', true, 0);
  displayElement('.actionButton', false, 0);

  animateLoaderBar();

  $(document).on('visibilitychange', () => GLOBAL.doVisualUpdates = !document.hidden);
  $(document).keyup(onKeyUp);  // The event listener for the key press (action buttons)

  GLOBAL.displayId = Object.keys(GLOBAL.displayData);   // Set the id to display in a normal array

  var tabContainerHTML = "";
  for (var i = 0; i < GLOBAL.displayId.length; ++i) {
    var id = GLOBAL.displayId[i];
    var tableHTML = getTableTitle(id, true);
    setTable(id, tableHTML);
    tabContainerHTML += getTitle(id);
  }
  setTabContainer(tabContainerHTML);
  displayElement(".tabContent", false, 0);


  $(document).ready(() => $("#mainFocus").focus());   // Set the main focus (replace autofocus attribute)
}

function animateLoaderBar() {
  $("#loaderBar").prop("innerHTML", "<span></span>");
  $("#loaderBar > span")
      .data("origWidth", $("#loaderBar > span").width())
      .width(0)
      .animate({width: $("#loaderBar > span").data("origWidth")}, 3000);
}

function openTab(id, isFirstLoading) {
  if (GLOBAL.currentDisplayedId != id) {
    GLOBAL.currentDisplayedId = id;
    GLOBAL.displayId.forEach(id => displayElement("#" + id + "Div", false, 0));   // Hide all tab content
    $(".tabLinks").removeClass("active");                                         // Remove the class "active" from all tabLinks"
    displayElement("#" + id + "Div", true);                                       // Show the current tab
    $("#" + id + "Button").addClass("active");                                    // Add an "active" class to the button that opened the tab

    if (!isFirstLoading && !GLOBAL.displayData[id].loadOnce) {
      updateValues(id);
    }
  }
}

function updateAllValues() {
  GLOBAL.displayId.forEach(id => updateValues(id, true));
}

function updateValues(id, forceReload, success) {
  const data = GLOBAL.displayData[id];
  getValue(data, data.updateTable, forceReload, success);
}

function openPopup(innerHTML) {
  $("#popup").prop("innerHTML", innerHTML);
  $(".contentOverlay").addClass("blur-filter");
  displayElement('#popupOverlay', true);
}

function closePopup() {
  displayElement('#popupOverlay', false, () => { $('.contentOverlay').removeClass('blur-filter');$('#mainFocus').focus(); });
}

function processTable(id, tableHTML, shouldFilter) {
  setTable(id, tableHTML);
  $("#" + id + "Button").prop('disabled', false);     // Activate button
  $(".auto").each((i, item) => autoAdaptWidth(item)); // Auto adapt all auto element


  // sorttable.makeSortable($("#" + id + "Table").get(0));
  if (shouldFilter) {
    filterTable(id);
  }
}

function getTableEditableCell(contents, data) {
  return getTableReadOnlyContent(contents[index-1][0], false)
       + getTableEditableContent(contents[index-1][1], data);
}

function getTableValidatableCell(id, contents, index, range, expected) {
  return getTableReadOnlyContent(contents[index-1][0], false)
       + getTableValidatableContent(id, contents[index-1][1], range, expected);
}

function getTableReadOnlyCell(contents, index) {
  return getTableReadOnlyContent(contents[index-1][0], false)
       + getTableReadOnlyContent(contents[index-1][1], false);
}

function getTableReadOnlyContent(content = "", isHeader, isDisabled, color) {
  if (!isHeader) {
    var matches = /\(([^)]+)\)/.exec(content);
    var value = matches ? matches[matches.length-1] : content;
    var isCur = /(€|%|\$)/.test(value);
    var color = getColor(value, isDisabled, isCur, color);
    return '<td align="center" style="color:' + color + '">' + content + '</td>';
  } else {
    return '<th align="center">' + content + '</th>'
  }
}

function getTableEditableContent(content, data) {
  var html = '';
  var symbol = '';
  var erase = '';
  if (data) {
    var type = "text";
    data.inputId = data.inputId || Math.random() * 10;  // Generates a random Id if it does not have any
    symbol = data.type == "euro" ? " €" : data.type == "percent" ? " %" : "";
    if (data.type == "number" || data.type == "euro" || data.type == "percent") {
      const min = data.min ?? 0;
      const max = data.max ?? 0;
      data.precision = data.precision ?? (data.type == "euro" ? 2 : 0);
      content = content ?? (data.required ? "0" : "");
      html = 'min="' + min + '" max="' + max + '"';
    } else if (data.type == "date") {
      type = "date";
    } else {
      html = ' minLength="' + data.minLength + '" maxLength="' + data.maxLength + '"';
    }
    html += ' id="' + data.inputId + '" type="' + type + '" placeholder="' + (data.placeholder ?? '') + '"'
         + ' data-type="' + (data.type ?? 'text') + '" data-precision="' + (data.precision ?? '') + '"'
         + ' style="' + (data.style ?? '') + '"' + (data.required ? ' required' : '')
         + ' pattern="' + (data.pattern ?? '') + '"';

    erase = data.erase
      ? '<span id="' + data.inputId + 'Erase" style="float:none;color:black;visibility:hidden" class="closebtn"'
        + ' onclick="$(\'#' + data.inputId + '\').val(\'\');$(\'#' + data.inputId + '\').keyup();$(\'#' + data.inputId + '\').focus();">&times;</span>'
      : '';
  }

  return '<td align="center"><div class="tooltip"><input class="auto"' + html
       + getEditCellHandler(content, data) + '">' + symbol + '</input>'
       + (data.tooltip ? '<span class="tooltiptext">' + data.tooltip + '</span>' : '')
       + '</div>' + erase + '</td>';
}

function getTableValidatableContent(id, content, range, expected) {
  return '<td class="validateContent" align="center" style="font-style:italic;background-color:'
       + (!expected || content == expected ? 'transparent' : 'pink') + '">'
       + '<div style="position:relative"><span>' + content + '</span>'
       + '<div style="position:absolute;left:35%;top:50%;" class="checkmark" value="' + toValue(content) + '"'
       + 'onclick="if(!$(this).hasClass(\'draw\')) { ' + getUpdateContent(id, range, GLOBAL.dummy) + ' }">'
       + '</div></div></td>';
}

function getEditCellHandler(expected, data) {
  return ' onfocusout="const error = getElementValidity(this); if (error) { $(this).focus(); showSnackBar(error); } else { '
       + (data && data.id && data.range ? getUpdateContent(data.id, data.range, expected) : '') + ' }"'
       + ' onkeyup="if (event.keyCode == 13) { $(this).blur() } else if (event.keyCode == 27)'
       + ' { this.value = \'' + expected + '\'; } autoAdaptWidth(this);'
       + (data && data.inputId && data.erase ? ' $(\'#' + data.inputId + 'Erase\').css(\'visibility\', $(this).val() ? \'visible\' : \'hidden\')' : '')
       + '" oninput="autoAdaptWidth(this);" type="text" value="' + expected + '"'
}

function getUpdateContent(id, range, expected) {
  return 'if (this.value != \'' + expected + '\') '
       + '{ setValue(\'' + range + '\', [[this.value || this.getAttribute(\'value\')]]'
       + (id ? id != GLOBAL.settings ? ', () => updateValues(\'' + id + '\', true)'
       : ', () => getValue({ id:GLOBAL.settings, formula:GLOBAL.settingsFormula }, null, true, updateAllValues)'
       : '') + '); }';
}

function getSubTableTitle(id, title, range) {
  return '<tr><td colspan="10"><input class="tableTitle auto" minLength="3" maxLength="30" style="font-size:16px;"'
       + getEditCellHandler(title, {id:id, range:range}) + '"></input></td></tr>';
}

function getTitle(id) {
  const title = translate(id);
  return '<button disabled id="' + id + 'Button" class="tabLinks" onclick="openTab(\'' + id + '\')">'
        + title.charAt(0).toUpperCase() + title.slice(1) + '</button>';
}

function getTableTitle(id, disabled, tooltip, colspan) {
  return '<table id="' + id + 'Content" class="tabContent"><tr style="background-color:white"><td><table style="border:0px;padding:0px;width:auto">'
       + '<tr style="background-color:white;"><td></td>'
       + (false ? '<td id="' + id + 'Switch" class="mainSwitch '
       + ($("#" + id + "Switch").is(":visible") ? '' : 'hidden') + '">'
       + '<div class="tooltip"><label class="switch" style="border:30px;margin:7px 0px 0px 0px;">'
       + '<input id="' + id + 'Filter" type="checkbox" ' + ($('#' + id + 'Filter').is(':checked') ? 'checked' : '')
       + ' onclick="filterTable(\'' + id + '\', true)">'
       + '<div class="slider round"></div></label><span class="tooltiptext">' + tooltip + '</span></div></td></tr></table>'
       + '<td colspan="' + colspan + '" align="right">'
       + '<input id="' + id + 'Search" type="text" placeholder="Search" class="mainSearch '
       + ($("#" + id + "Search").is(":visible") ? '' : 'hidden') + '" '
       + 'onkeyup="filterTable(\'' + id + '\');" onchange="filterTable(\'' + id + '\');"'
       + 'value="' + ($('#' + id + 'Search').val() || "") + '">' : '')
       + '</tr></table>' + getMainTableHead(id);
}

function getMainTableHead(id) {
  return '<table id="' + id + 'Table" class="sortable mainTable">';
}

// function getTitle(id, disabled) {
//   return '<h2'
//         + (!disabled ? ' onclick="var shouldDisplay = !$(\'#' + id + 'Table\').is(\':visible\');'
//         + 'if(shouldDisplay){updateValues(\'' + id + '\');};'
//         + 'for (suffix of [\'Table\', \'Switch\', \'Search\']) {'
//         + '$(\'.main\' + suffix).each((i, item) => toggleItem(\'' + id + '\' + suffix, item, shouldDisplay)); }"' : '')
//         + '>' + id.charAt(0).toUpperCase() + id.slice(1) + '</h2>';
// }

// function getTableTitle(id, disabled, tooltip, colspan) {
//   return '<table><tr style="background-color:white"><td><table style="border:0px;padding:0px;width:auto">'
//        + '<tr style="background-color:white;"><td>' + getTitle(id, disabled) + '</td>'
//        + (false ? '<td id="' + id + 'Switch" class="mainSwitch '
//        + ($("#" + id + "Switch").is(":visible") ? '' : 'hidden') + '">'
//        + '<div class="tooltip"><label class="switch" style="border:30px;margin:7px 0px 0px 0px;">'
//        + '<input id="' + id + 'Filter" type="checkbox" ' + ($('#' + id + 'Filter').is(':checked') ? 'checked' : '')
//        + ' onclick="filterTable(\'' + id + '\', true)">'
//        + '<div class="slider round"></div></label><span class="tooltiptext">' + tooltip + '</span></div></td></tr></table>'
//        + '<td colspan="' + colspan + '" align="right">'
//        + '<input id="' + id + 'Search" type="text" placeholder="Search" class="mainSearch '
//        + ($("#" + id + "Search").is(":visible") ? '' : 'hidden') + '" '
//        + 'onkeyup="filterTable(\'' + id + '\');" onchange="filterTable(\'' + id + '\');"'
//        + 'value="' + ($('#' + id + 'Search').val() || "") + '">' : '')
//        + '</tr></table>' + getMainTableHead(id);
// }

// function getMainTableHead(id) {
//   return '<table id="' + id + 'Table" class="sortable mainTable '
//        + ($("#" + id + "Table").is(":visible") ? '' : 'hidden') + '">';
// }

function getColor(value, isDisabled = false, isCur = true, forcedColor) {
  var number = toValue(value);
  return forcedColor ? forcedColor
                     : isDisabled || (!isNaN(number) && number == 0) ? "wheat"
                     : isCur ? number > 0 ? "green" : "red"
                     : "black";
}

function setTable(id, tableHTML) {
  tableHTML += '</table>';
  $("#" + id + "Div").prop("innerHTML", tableHTML);
}

function setEvents() {
  $(".checkmark")
    .on("click", e => $(e.target).addClass('draw'))
    .on("animationend", e => $(e.target).removeClass('draw'));

  $(".validateContent").hover(
    e => { var c = $(e.target).children().children(); c.first().fadeOut(); c.last().fadeIn(); },
    e => { var c = $(e.target).children().children(); c.last().fadeOut(); c.first().fadeIn(); });
}

function setTabContainer(innerHTML) {
  $("#tabContainer").prop("innerHTML", innerHTML);  // Set the tab buttons content
  $(".tabLinks").css("width", 100/GLOBAL.displayId.length + "%");   // Tab buttons should be centered
}

function toggleItem(id, item, shouldDisplay) {
  var isCurrentId = item.id == id;
  var shouldDisplay = shouldDisplay && isCurrentId;
  displayElement(item, shouldDisplay, isCurrentId ? 1000 : 0)
}

function autoAdaptWidth(e) {
  checkElement(e);

  if (!e.placeholder) {
    var size = e.style.fontSize ? e.style.fontSize : "13.33px";
    var step = parseFloat(size)/1.8;
    var index = 1;
    e.style.width = Math.ceil(Math.max(String(e.value).length, 1) * step + index) + "px";
  }
}

function checkElement(e) {
  const type = e.dataset.type;

  // Filter the entered value through a regular expression
  if (type == "number" || type == "euro" || type == "percent") {
    const min = parseFloat(e.min);
    const max = parseFloat(e.max);
    const precision = parseInt(e.dataset.precision) || 0;
    const maxLength = Math.max(String(parseInt(min)).length, String(parseInt(max)).length) + precision;
    const pattern = e.pattern || "^" + (min < 0 ? max < 0 ? "-+" : "-?" : "") + "([0-9]" + (e.required ? '+' : '*') + "$"
      + (precision > 0 ? "|[0-9]+\\.?[0-9]{0," + precision + "}$" : "") + ")";
    const regexp = new RegExp(pattern);
    var val = parseFloat(e.value);
    while (e.value && (!regexp.test(e.value) ||
      (!isNaN(val) && (val > max || val * Math.pow(10, precision) % 1 !== 0 || e.value.length > maxLength)))) {
      e.value = e.value.slice(0, -1);
      val = parseFloat(e.value);
    }
  } else if (type != "date") {
    const maxLength = parseInt(e.maxLength) ?? 30;
    const pattern = e.pattern
      || (type == "email" ? "^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$"
      : type == "iban" ? "^([A-Z]{2}[ \-]?[0-9]{2})(?=(?:[ \-]?[A-Z0-9]){9,30}$)((?:[ \-]?[A-Z0-9]{3,5}){2,7})([ \-]?[A-Z0-9]{1,3})?$"
      : type == "url" ? "https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)"
      : "^\\w{0," + maxLength + "}$");
    const regexp = new RegExp(pattern);
    while (e.value && (!regexp.test(e.value) || e.value.length > maxLength)) {
      e.value = e.value.slice(0, -1);
    }
  }
}

function getElementValidity(e) {
  const type = e.dataset.type;
  const minLength = type == "number" || type == "euro" || type == "percent" ? e.required ? 1 : 0
   : type != "date" ? e.minLength || (e.required ? 3 : 0) : 0;

  return e.value.length < minLength ? "Value should have at least " + minLength + " character(s) !"
    : e.min && e.value && parseFloat(e.value) < parseFloat(e.min) ? "Value should exceed " + roundDown(e.min, parseInt(e.dataset.precision) || 2)
    : null;
}

function selectName(e, index) {
  if (index !== undefined) {
    $('#transactionName').prop("selectedIndex", index);
  } else {
    index = e.selectedIndex;
  }

  displayElement("#transactionQuantityLabel", e.options[index].title);
}

function getValue(data, func, forceReload, success) {
  const id = data.id;
  if (!id || (id && $("#loading").text() == "")) {
    if (!id || forceReload || !GLOBAL.hasAlreadyUpdated[id]) {
      displayLoading(id, true);

      google.script.run
                   .withSuccessHandler(contents => {
                     if (id) {
                       GLOBAL.data[id] = contents;
                     }
                     if (func) {
                       func(id, contents);
                     }
                     if (success) {
                       success();
                     }
                     displayLoading(id, false);

                     if (id && !GLOBAL.loadingQueueCount) {
                       setEvents();  // Set events when everything has been loaded
                     }
                   })
                   .withFailureHandler(displayError)
                   .getSheetValues(data.formula, data.filter != null ? GLOBAL.userId : null, data.filter);
    }
  } else {
    ++GLOBAL.loadingQueueCount;
    setTimeout(() => {
      GLOBAL.loadingQueueCount = Math.max(GLOBAL.loadingQueueCount-1, 0);
      getValue(data, func, forceReload, success)
    }, 100);
  }
}

function setValue(range, value, success) {
  google.script.run
               .withSuccessHandler(contents => { if (success) { success(); } showSnackBar("Value has been updated !"); })
               .withFailureHandler(displayError)
               .setSheetValues(range, value);
}

function filterTable(id, shouldReload) {
  const histoId = GLOBAL.displayData.historic.id;
  const investId = GLOBAL.displayData.investment.id;
  const evolId = GLOBAL.displayData.evolution.id;

  var isChecked = $("#" + id + "Filter").is(':checked');
  var search = $('#' + id + 'Search').val() ? $('#' + id + 'Search').val().toUpperCase() : "";
  var index = id == histoId ? 2 : 0;
  var searchFunc = item => $(item).children("td")[index] && $(item).children("td")[index].innerHTML.toUpperCase().includes(search);
  var filterFunc = id == investId ? (i, item) => (!isChecked || shouldRebalance($(item).children("td")[6] ? $(item).children("td")[6].innerHTML : null)) && searchFunc(item)
                 : id == histoId || id == evolId ? (i, item) => (isChecked || i < GLOBAL.dataPreloadRowLimit) && searchFunc(item)
                 : (i, item) => true;
  var displayFunc = (i, item) => { var fn = filterFunc(i, item) ? a => $(a).show() : a => $(a).hide(); fn(item); };
  var loadFunc = (id == histoId || id == evolId) && shouldReload && isChecked
               ? null
               : null;

  // $("#" + id + "Table tbody tr").each(displayFunc);

  refreshTotal(id);
}

function refreshTotal(id) {
  if (id == GLOBAL.displayData.historic.id) {
    var calculateFunc = (i, item) => {
      item = $(item).children("td");
      for (var j = 0; j < item.length; ++j) {
        a[j] += j == 0 ? 1
              : j == 1 ? item[5].innerHTML ? 1 : 0
              : j == 2 ? item[7].innerHTML ? 1 : 0
              : j == 3 ? item[8].innerHTML ? 1 : 0
              : toValue(item[j].innerHTML);
      }
    };
    var footerFunc = () =>
      '<td colspan="3" align="center">' + a[0] + ' rows</td>'
       + '<td>' + a[4].toFixed(0) + '</td>'
       + '<td>' + toCurrency(a[5]/a[1]) + '</td>'
       + '<td title="' + toCurrency(a[6]/a[0]) + '">' + toCurrency(a[6]) + '</td>'
       + '<td title="' + toCurrency(a[7]/a[2]) + '">' + toCurrency(a[7]) + '</td>'
       + '<td title="' + toCurrency(a[8]/a[3]) + '">' + toCurrency(a[8]) + '</td>';
  } else if (id == GLOBAL.displayData.evolution.id) {
    var calculateFunc = (i, item) => {
      item = $(item).children("td");
      for (var j = 0; j < item.length; ++j) {
        a[j] += j == 0 ? 1 : toValue(item[j].innerHTML);
      }
    };
    var footerFunc = () => {
      var footer = "";
      for (var i = 1; i < a.length; i++) {
        footer += '<td>' + toCurrency(a[i]/a[0], 2, i < 5 ? '%' :'€') + '</td>';
      }
      return footer;
    }
  }

  if (calculateFunc) {
    var max = !$('#' + id + 'Filter').is(':checked')
      ? GLOBAL.dataPreloadRowLimit : $("#" + id + "Table tbody tr").length;
    var elem = $("#" + id + "Table tbody tr:visible").length == 0
             ? $("#" + id + "Table tbody tr:lt(" + max + ")")
             : $("#" + id + "Table tbody tr:visible");
    var a = new Array(elem.length).fill(0);
    elem.each(calculateFunc);
    $("#" + id + "Footer").prop("innerHTML", '<td>TOTAL</td>' + footerFunc());
  }
}

function showSnackBar(text) {
  if (text) {
    $("#snackbar").text(translate(text));
  }

  // Shows the snackbar only if has text and is not already displayed
  if ($("#snackbar").text() && !$("#snackbar").hasClass("show")) {
    $("#snackbar").addClass("show");

    // After 3 seconds, remove the show class from DIV
    setTimeout(() => { $("#snackbar").removeClass("show"); $("#snackbar").text(""); }, 3000);
  }
}

function displayLoading(id, isDisplayed) {
  if (id) {
    GLOBAL.currentLoadingId = isDisplayed ? id : null;
    $("#loading").text(isDisplayed ? translate("Loading") + " " + translate(id) + " ..." : null);
    if (isDisplayed || GLOBAL.loadingQueueCount) {
      GLOBAL.hasAlreadyUpdated[id] = true;
      setTimeout(() => GLOBAL.hasAlreadyUpdated[id] = false, GLOBAL.timeBetweenReload*1000);
      displayElement("#updateButton", false);
    } else {
      setTimeout(() => displayElement("#updateButton", !GLOBAL.loadingQueueCount), 100);  // Hack for local refresh because it loads everything in the same function
    }
  }
}

function displayElement(id, isDisplayed, duration = "slow", complete) {
  var fn = isDisplayed
    ? () => $(id).fadeIn(duration, complete)
    : () => $(id).fadeOut(duration, complete);
  fn();
}

function overDisplay(idToHide, idToShow, complete) {
  displayElement(idToHide, false, () => displayElement(idToShow, true, complete));
}

function showLoader(isDisplayed) {
  displayElement('#loaderOverlay', isDisplayed);
  $('.contentOverlay').fadeTo(1000, isDisplayed ? 0.3 : 1);
}

function executionSuccess() {
  // updateAllValues();
  showLoader(false);
  cancelForm();
  showSnackBar();
}

function displayError(msg, isWarning) {
  showLoader(false);
  displayLoading(GLOBAL.currentLoadingId, false);

  $("#alert").css("background-color", isWarning ? "#ff9800" : "#f44336");
  $("#alert").prop("innerHTML", '<span class="closebtn" onclick="displayElement(\'#alertOverlay\', false, () => $(\'#transactionName\').focus());">&times;</span>'
                              + '<strong>' + (isWarning ? "WARNING" : "ALERT") + ':</strong> ' + msg);
  displayElement('#alertOverlay', true);
  displayElement("#updateButton", true);
}

function translate(content) {
  return content.includes("€") || content.includes("%") || !isNaN(content) ? batchTranslate(content, [',', '.'])  // Numbers
    : content.includes("month") || content.includes("year") ? batchTranslate(content, ['months', 'year'])         // Duration
    : getTranslateData(content).text;  // Text
}

function getTranslateData(content) {
  const a = GLOBAL.data[GLOBAL.translation];
  if (a && content) {
    const num = content.replace(/^\D+|\D+$/g, "");            // Extranct number from content
    const trans = num ? content.replace(num, '*') : content;  // Replace number by * to find translation

    const i = indexOf(a, trans, 0, 1);

    return {text:i ? a[i][1].replace('*', num) : content, tooltip:i ? a[i][2] : null};
  } else {
    return {text:content};
  }
}

function batchTranslate(content, array) {
  array.forEach(item => content = content.replace(item, getTranslateData(item).text));
  return content;
}

function shouldRebalance(value) {
  return value && !value.startsWith("HOLD");
}

function toValue(content) {
  return content ? parseFloat(String(content).replace(",", "")
                                             .replace(" ", "")
                                             .replace("$", "")
                                             .replace("€", "")
                                             .replace("%", ""))
                 : 0;
}

function toCurrency(content, precision = 2, symbol = '€') {
  var str = String(toValue(content));
  var ln = str.length;
  var neg = str.startsWith("-") ? -1 : 0;
  var i = str.indexOf(".") != -1 ? str.indexOf(".") : ln;
  str = i != ln ? str.slice(0, i+precision+1).replace(/0+$/g, '') : str + ".";
  var j = str.length-str.indexOf(".")-1;
  str = (j < 2 ? str + '0'.repeat(2-j) : str) + " " + symbol;

  return i + neg > 9 ? str.slice(0, i-9) + "," + str.slice(i-9, i-6) + "," + str.slice(i-6, i-3) + "," + str.slice(i-3)
       : i + neg > 6 ? str.slice(0, i-6) + "," + str.slice(i-6, i-3) + "," + str.slice(i-3)
       : i + neg > 3 ? str.slice(0, i-3) + "," + str.slice(i-3)
       : str;
}

function toStringDate(date) {
  if (typeof(date) == "string") {
    return date && date.split("/").length == 3
    ? date.replace(/(^|\/)0+/g, "$1").split("/")[1] + "/"
    + date.replace(/(^|\/)0+/g, "$1").split("/")[0] + "/"
    + date.split("/")[2]
    : null;
  } else if (typeof(date) == "object") {
    var day = date.getDate();
    var month = date.getMonth() + 1;   //January is 0!
    var year = date.getFullYear();
    day = day < 10 ? '0' + day : day;
    month = month < 10 ? '0' + month : month;
    return month + "/" + day + "/" + year;
  } else {
    return toStringDate(new Date());
  }
}

function indexOf(array, value, index, start, compare) {
  var index = index >= 0 ? index : null;
  var x = Number.isInteger(start) ? start : 0;
  var fn = compare ? compare : (a, b) => a == b;

  var i;
  if (Array.isArray(array)) {
    while(x < array.length
       && ((index == null && !fn(array[x], value))
        || (index != null && !fn(array[x][index], value)))) { ++x; }

    i = x < array.length ? x : null;
  }

  return i;
}

function restrainFormula(formula, low, high) {
  formula = formula.replace(/\d+/g, '');
  if (low != -1 && high != -1) {
    var a = formula.split(':');
    a[0] += low > 1 ? low : 1;
    a[1] += high > 1 ? high : GLOBAL.dataPreloadRowLimit+1;
    formula = a[0] + ':' + a[1];
  }

  return formula;
}

function roundDown(value, precision = 0) {
  return (value * Math.pow(10, precision) | 0) / Math.pow(10, precision);
}
