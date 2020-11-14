// USE EXAMPLE :
// google.script.run
//              .withSuccessHandler(function(contents) {
//                updateDashboardTable(contents);
//              })
//              .withFailureHandler(displayError)
//              .getSheetValues("Dashboard!A:B");


class google {
  static get script() {
    return Script;
  }
}

class Script {
  static get run() {
    return new Run();
  }
}

class Run {
  static #singleton;
  static #data = [];
  static #workbook;
  #sh = () => {};
  #fh = (error) => {};
  constructor() {
    if (!Run.#singleton) {    // Run only once
      this.doGet(new URLSearchParams(location.search));
      Run.#singleton = true;
    }
  }
  withSuccessHandler(func) {
    this.#sh = func;
    return this;
  }
  withFailureHandler(func) {
    this.#fh = func;
    return this;
  }
  doGet(e) {
    this.setProperty("userId", e.get("id") ?? "");

    Template.evaluate()
            .setTitle('Finance Manager')
            .setFaviconUrl('Img/Favicon.png');
  }
  getProperty(key) {
    try {
      this.#sh(Run.#data[key]);
    } catch (error) {
      this.#fh(error);
    }
  }
  setProperty(key, value) {
    try {
      Run.#data[key] = value;
      this.#sh();
    } catch (error) {
      this.#fh(error);
    }
  }
  async getSheetValues(range) {
    if (!Run.#workbook) {
      var url = "Data/Finance Manager Spreadsheet.xlsx";
      // var url  = "https://rawgit.com/flodef/FM/master/Data/Finance Manager Spreadsheet.xlsx";
      var run = this;

      await fetch(url)
      .then((response) => {
        if(response.ok) {
          return response.arrayBuffer();
        }
        throw new Error('Network response was not ok.');
      }).then((buffer) => {
        var data = new Uint8Array(buffer);
        Run.#workbook = XLSX.read(data, {type:"array"});
        run.#sh(run.#getData(range));
      }).catch(this.#fh);
    } else {
      this.#sh(this.#getData(range));
    }
  }
  async getSheetValuesWithFilter(range, filter, column = 0) {
    var content = [];
    var temp = getSheetValues(range);

    content.push(temp[0]);
    for (var i = 1; i < temp.length; ++i) {
      if (temp[i][column] == filter) {
        var filterRow = [];
        for (var j = 0; j < temp[i].length; ++j) {
          filterRow.push(temp[i][j]);
        }
        content.push(filterRow);
      }
    }

    return content;
  }

  async setSheetValues(range, values) { this.#sh(); }
  async clearSheetValues(range) { this.#sh(); }
  async insertRows(sheetId, values, range) { this.#sh(); }
  async deleteRows(sheetId, startIndex, endIndex) { this.#sh(); }
  async sortColumn(sheetId, index, descending) { this.#sh(); }

  #getData(range) {
    var a = range.split("!");
    var sheetName = a[0];
    var sheet = Run.#workbook.Sheets[sheetName];
    var fullRange = sheet["!ref"];
    var r = a.length >= 2 ? a[1] : fullRange;
    var ar = r.split(':');
    var sr = ar[0];
    var er = ar[1] || ar[0];    // Set the starting range as the ending range if none (eg : sheet!A1)
    var dr = XLSX.utils.decode_range(fullRange);
    sr += !this.#hasNumber(sr) ? (dr.s.r+1) : "";
    er += !this.#hasNumber(er) ? (dr.e.r+1) : "";
    range = sr + ':' + er;
    var array = XLSX.utils.sheet_to_json(sheet, {header:1, raw:false, range:range, defval:""});

    return array;
  }
  #hasNumber(string) {
    return /\d/.test(string);
  }
}

class Template {
  static evaluate() {
    // SET HERE ALL THE STUFF RELATIVE TO GOOGLE APP SCRIPT INIT
    var url = document.URL.split('/');
    window.history.pushState('', '', url[url.length-1].split('?')[0]);   // Reset passed value to simulate google server behavior
    return Template;
  }
  static setTitle(title) {
    var url = document.URL.split('/');
    var page = url[url.length-1].split('.')[0];
    document.title = page == "index" ? title : 'FiMs Associé';
    return Template;
  }
  static setFaviconUrl(url) {
    var link = document.querySelector("link[rel*='icon']") || document.createElement('link');
        link.type = 'image/png';
        link.rel = 'icon';
        link.href = url;
    document.head.appendChild(link);
    return Template;
  }
}
