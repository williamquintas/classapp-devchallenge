//Requirements
var validator = require('validator');
var PNF = require('google-libphonenumber').PhoneNumberFormat;
var phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

//Function that returns when requiring this module
module.exports = function csvJSON(csv){
  //Break the CSV file in lines
  var lines=csv.split("\n");
  var result = [];
  var headers = [];
  var json = [];

  //Gets the headers of the CSV
  while(lines[0].length > 0) {
    //If it starts with " - composed string
    if (lines[0].charAt(0) === '\"') {
      lines[0] = lines[0].slice(1);         //Eliminate the first " occurrency
      var end = lines[0].search('\"');      //Search the next " occurrency
      var word = lines[0].slice(0, end);    //Gets the header
      headers.push(word);
      lines[0] = lines[0].slice(end+2);     //Remove the header from the line
    }
    else {
      var end = lines[0].search(',');       //Search the next ',' occurrency'
      //Handle the case of end of line
      if (end != -1) {
        var word = lines[0].slice(0, end);  //Gets the header
        headers.push(word);                 //Adds to the headers array
        lines[0] = lines[0].slice(end+1);   //Remove the header from the line
      }
      else {
        var word = lines[0].slice(0);       //Gets the header
        headers.push(word);                 //Adds to the headers array
        lines[0] = "";                      //Clear the line
      }
    }
  }

  //Pass through the lines
  for(var i=1;i<lines.length;i++){
	  var obj = {};
	  var currentline=[];

    //Transforms the content of the current line in an array
    while(lines[i].length > 0) {     //Eliminates the last line
      //If it starts with " - composed string
      if (lines[i].charAt(0) === '\"') {
        lines[i] = lines[i].slice(1);         //Eliminate the first " occurrency
        var end = lines[i].search('\"');      //Search the next " occurrency
        var word = lines[i].slice(0, end);    //Gets the word
        currentline.push(word);
        lines[i] = lines[i].slice(end+2);     //Remove the header from the line
      }
      else {
        var end = lines[i].search(',');       //Search the next ',' occurrency'
        //Handle the case of end of line
        if (end != -1) {
          var word = lines[i].slice(0, end);  //Gets the word
          currentline.push(word);             //Adds to the currentline array
          lines[i] = lines[i].slice(end+1);   //Remove the header from the line
        }
        else {
          var word = lines[i].slice(0);       //Gets the word
          currentline.push(word);             //Adds to the currentline array
          lines[i] = "";                      //Clear the line
        }
      }
    }
    //Matches the header with the information in the line
	  for(var j=0;j<headers.length;j++){
      //Verifies if there is another data already saved in this header
      if (obj[headers[j]] === undefined) {
        if(currentline[j] !== undefined && currentline[j] !== ''){
          obj[headers[j]] = currentline[j];
        }
      }
      else {
        var array = [];
        array.push(obj[headers[j]]);
        if(currentline[j] !== undefined && currentline[j] !== ''){
          array.push(currentline[j]);
        }
        obj[headers[j]] = array;
      }
	  }
    //Eliminates the last line and push to the object the current line
    if (i != lines.length - 1) {
        result.push(obj);
    }
  }

  /* Format the json */
  for (var i = 0; i < result.length; i++) {
    /* Verifies if this person is already registered */
    if (searchPerson(json, result[i].fullname, result[i].eid) == -1) {
      var person = {};
      person.fullname = result[i].fullname;
      person.eid = result[i].eid;
      //Treatment for classes
      var classes = [];
      result[i].class.forEach(function(thisArg) {
        //Classes saparated with ,
        if (thisArg.search(',') !== -1) {
          var items = thisArg.split(',');
          items.forEach(function(thisArg) {
            classes.push(thisArg.trim());
          })
        //Classes saparated with /
        } else if (thisArg.search('/') !== -1) {
          var items = thisArg.split('/');
          items.forEach(function(thisArg) {
            classes.push(thisArg.trim());
          })
        //Just one class
        } else {
          classes.push(thisArg.trim());
        }
      });
      //Saves the classes
      person.classes = classes;
      //Need not save the classes as an array when there is only one class
      if (person.classes.length === 1) {
        person.classes = person.classes[0];
      }

      //Format the addresses - email and phone
      var addresses = [];
      for (var j = 0; j < headers.length; j++) {
        if (headers[j] !== 'fullname' &&
            headers[j] !== 'eid' &&
            headers[j] !== 'class' &&
            headers[j] !== 'invisible' &&
            headers[j] !== 'see_all') {
          //Gets the type of address
          var type = headers[j].slice(0, headers[j].indexOf(' '));
          //Eliminates the type from the string
          var s = headers[j].substr(headers[j].indexOf(' '));
          //Split when there are commas
          var items = s.split(',');
          var tags = [];
          //Saves the tags of the address
          items.forEach(function(thisArg) {
            tags.push(thisArg.trim());
          });
          //If there is a address to be saved
          if (result[i][headers[j]] !== undefined) {
            //Addresses separateds by commas
            if (result[i][headers[j]].search(',') !== -1){
              var a = result[i][headers[j]].split(',');
              a.forEach(function(thisArg) {
                //Declare the addresses
                var address = {};
                address.type = type.trim();
                address.tags = tags;
                if (type === 'email') {
                  //Validate the email
                  if (validator.isEmail(thisArg) === true){
                    address.address = thisArg;
                    //Verifies if the address is already saved with other tags
                    var search = searchAddress(addresses, thisArg);
                    if (search === -1) {
                      addresses.push(address);
                    }
                    else {
                      tags.forEach(function(thisArg){
                        addresses[search].tags.push(thisArg);
                      });
                    }
                  }
                }
                else if (type === 'phone') {
                  //Validate if is a phone number
                  if (validator.isMobilePhone(thisArg, 'any')) {
                    //Parse as a phone number from Brazil
                    var p = phoneUtil.parse(thisArg, 'BR');
                    //Validate if is a Valid Number in Brazil
                    if (phoneUtil.isValidNumber(p)){
                      address.address = phoneUtil.format(p, PNF.E164);
                      address.address = address.address.replace('+','');
                      //Verifies if the address is already saved with other tags
                      var search = searchAddress(addresses, thisArg);
                      if (search === -1) {
                        addresses.push(address);
                      }
                      else {
                        tags.forEach(function(thisArg){
                          addresses[search].tags.push(thisArg);
                        });
                      }
                    }
                  }
                }
              });
            }
            //Addresses separateds by /
            else if (result[i][headers[j]].search('/') !== -1){
              var a = result[i][headers[j]].split('/');
              a.forEach(function(thisArg) {
                //Declare the address
                var address = {};
                address.type = type.trim();
                address.tags = tags;
                if (type === 'email') {
                  //Validate the email
                  if (validator.isEmail(thisArg) === true){
                    address.address = thisArg;
                    //Verifies if the address is already saved with another tags
                    var search = searchAddress(addresses, thisArg);
                    if (search === -1) {
                      addresses.push(address);
                    }
                    else {
                      tags.forEach(function(thisArg){
                        addresses[search].tags.push(thisArg);
                      });
                    }
                  }
                }
                else if (type === 'phone') {
                  //Validate if is a phone number
                  if (validator.isMobilePhone(thisArg, 'any')) {
                    //Parse as a phone number from Brazil
                    var p = phoneUtil.parse(thisArg, 'BR');
                    //Validate if is a Valid Number in Brazil
                    if (phoneUtil.isValidNumber(p)){
                      address.address = phoneUtil.format(p, PNF.E164);
                      address.address = address.address.replace('+','');
                      //Verifies if the address is already saved with other tags
                      var search = searchAddress(addresses, thisArg);
                      if (search === -1) {
                        addresses.push(address);
                      }
                      else {
                        tags.forEach(function(thisArg){
                          addresses[search].tags.push(thisArg);
                        });
                      }
                    }
                  }
                }
              });
            }
            else {
              //Declare the address
              var address = {};
              address.type = type.trim();
              address.tags = tags;
              if (type === 'email') {
                //Validate the email
                if (validator.isEmail(result[i][headers[j]]) === true){
                  //Verifies if the address is already saved with another tags
                  var search = searchAddress(addresses, result[i][headers[j]]);
                  if (search === -1) {
                    address.address = result[i][headers[j]];
                    addresses.push(address);
                  }
                  else {
                    tags.forEach(function(thisArg){
                      addresses[search].tags.push(thisArg);
                    });
                  }
                }
              }
              else if (type === 'phone') {
                //Validate if is a phone number
                if (validator.isMobilePhone(result[i][headers[j]],'any') === true) {
                  //Parse as a phone number from Brazil
                  var p = phoneUtil.parse(result[i][headers[j]], 'BR');
                  //Validate if is a Valid Number in Brazil
                  if (phoneUtil.isValidNumber(p)){
                    address.address = phoneUtil.format(p, PNF.E164);
                    address.address = address.address.replace('+','');
                    //Verifies if the address is already saved with another tags
                    var search = searchAddress(addresses, result[i][headers[j]]);
                    if (search === -1) {
                      addresses.push(address);
                    }
                    else {
                      tags.forEach(function(thisArg){
                        addresses[search].tags.push(thisArg);
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }
      //Save the addresses to the person
      person.addresses = addresses;

      //Formats invisible
      if (result[i].invisible == 0 ||
          result[i].invisible == 'no' ||
          result[i].invisible == false ||
          result[i].invisible == undefined) {
        person.invisible = false;
      }
      else if ( result[i].invisible == 1 ||
                result[i].invisible == 'yes' ||
                result[i].invisible == true) {
        person.invisible = true;
      }
      if (result[i].invisible == '') {
        delete person.invisible;
      }
      //Formats see_all
      if (result[i].see_all == 0 ||
          result[i].see_all == 'no' ||
          result[i].see_all == false ||
          result[i].invisible == undefined) {
        person.see_all = false;
      }
      else if (result[i].see_all == 1 ||
                 result[i].see_all == 'yes' ||
                 result[i].see_all == true) {
        person.see_all = true;
      }
      if (result[i].see_all == '') {
        delete person.see_all;
      }
      //Saves the person to the final json
      json.push(person);
    }

    else {
      //Gets the index where the person is saved in the json
      var index = searchPerson(json, result[i].fullname, result[i].eid);
      //Treatment for classes
      if (json[index].classes === undefined) {
        var classes = [];
      }
      else {
        var classes = json[index].classes;
      }
      result[i].class.forEach(function(thisArg) {
        //Classes saparated with ,
        if (thisArg.search(',') !== -1) {
          var items = thisArg.split(',');
          items.forEach(function(thisArg) {
            classes.push(thisArg.trim());
          })
        //Classes saparated with /
        } else if (thisArg.search('/') !== -1) {
          var items = thisArg.split('/');
          items.forEach(function(thisArg) {
            classes.push(thisArg.trim());
          })
        //Just one class
        } else {
          classes.push(thisArg.trim());
        }
      });
      //Saves the classes
      json[index].classes = classes;
      //Need not save the classes as an array when there is only one class
      if (json[index].classes.length === 1) {
        json[index].classes = json[index].classes[0];
      }

      //Format the addresses - email and phone
      if (json[index].addresses === undefined) {
        var addresses = [];
      }
      else {
        var addresses = json[index].addresses;
      }
      for (var j = 0; j < headers.length; j++) {
        if (headers[j] !== 'fullname' &&
            headers[j] !== 'eid' &&
            headers[j] !== 'class' &&
            headers[j] !== 'invisible' &&
            headers[j] !== 'see_all') {
          //Gets the type of address
          var type = headers[j].slice(0, headers[j].indexOf(' '));
          //Eliminates the type from the string
          var s = headers[j].substr(headers[j].indexOf(' '));
          //Split when there are commas
          var items = s.split(',');
          var tags = [];
          //Saves the tags of the address
          items.forEach(function(thisArg) {
            tags.push(thisArg.trim());
          });
          //If there is a address to be saved
          if (result[i][headers[j]] !== undefined) {
            //Addresses separateds by commas
            if (result[i][headers[j]].search(',') !== -1){
              var a = result[i][headers[j]].split(',');
              a.forEach(function(thisArg) {
                //Declare the addresses
                var address = {};
                address.type = type.trim();
                address.tags = tags;
                if (type === 'email') {
                  //Validate the email
                  if (validator.isEmail(thisArg) === true){
                    address.address = thisArg;
                    //Verifies if the address is already saved with other tags
                    var search = searchAddress(addresses, thisArg);
                    if (search === -1) {
                      addresses.push(address);
                    }
                    else {
                      tags.forEach(function(thisArg){
                        addresses[search].tags.push(thisArg);
                      });
                    }
                  }
                }
                else if (type === 'phone') {
                  //Validate if is a phone number
                  if (validator.isMobilePhone(thisArg, 'any')) {
                    //Parse as a phone number from Brazil
                    var p = phoneUtil.parse(thisArg, 'BR');
                    //Validate if is a Valid Number in Brazil
                    if (phoneUtil.isValidNumber(p)){
                      address.address = phoneUtil.format(p, PNF.E164);
                      address.address = address.address.replace('+','');
                      //Verifies if the address is already saved with other tags
                      var search = searchAddress(addresses, thisArg);
                      if (search === -1) {
                        addresses.push(address);
                      }
                      else {
                        tags.forEach(function(thisArg){
                          addresses[search].tags.push(thisArg);
                        });
                      }
                    }
                  }
                }
              });
            }
            //Addresses separateds by /
            else if (result[i][headers[j]].search('/') !== -1){
              var a = result[i][headers[j]].split('/');
              a.forEach(function(thisArg) {
                //Declare the address
                var address = {};
                address.type = type.trim();
                address.tags = tags;
                if (type === 'email') {
                  //Validate the email
                  if (validator.isEmail(thisArg) === true){
                    address.address = thisArg;
                    //Verifies if the address is already saved with another tags
                    var search = searchAddress(addresses, thisArg);
                    if (search === -1) {
                      addresses.push(address);
                    }
                    else {
                      tags.forEach(function(thisArg){
                        addresses[search].tags.push(thisArg);
                      });
                    }
                  }
                }
                else if (type === 'phone') {
                  //Validate if is a phone number
                  if (validator.isMobilePhone(thisArg, 'any')) {
                    //Parse as a phone number from Brazil
                    var p = phoneUtil.parse(thisArg, 'BR');
                    //Validate if is a Valid Number in Brazil
                    if (phoneUtil.isValidNumber(p)){
                      address.address = phoneUtil.format(p, PNF.E164);
                      address.address = address.address.replace('+','');
                      //Verifies if the address is already saved with other tags
                      var search = searchAddress(addresses, thisArg);
                      if (search === -1) {
                        addresses.push(address);
                      }
                      else {
                        tags.forEach(function(thisArg){
                          addresses[search].tags.push(thisArg);
                        });
                      }
                    }
                  }
                }
              });
            }
            else {
              //Declare the address
              var address = {};
              address.type = type.trim();
              address.tags = tags;
              if (type === 'email') {
                //Validate the email
                if (validator.isEmail(result[i][headers[j]]) === true){
                  //Verifies if the address is already saved with another tags
                  var search = searchAddress(addresses, result[i][headers[j]]);
                  if (search === -1) {
                    address.address = result[i][headers[j]];
                    addresses.push(address);
                  }
                  else {
                    tags.forEach(function(thisArg){
                      addresses[search].tags.push(thisArg);
                    });
                  }
                }
              }
              else if (type === 'phone') {
                //Validate if is a phone number
                if (validator.isMobilePhone(result[i][headers[j]],'any') === true) {
                  //Parse as a phone number from Brazil
                  var p = phoneUtil.parse(result[i][headers[j]], 'BR');
                  //Validate if is a Valid Number in Brazil
                  if (phoneUtil.isValidNumber(p)){
                    address.address = phoneUtil.format(p, PNF.E164);
                    address.address = address.address.replace('+','');
                    //Verifies if the address is already saved with another tags
                    var search = searchAddress(addresses, result[i][headers[j]]);
                    if (search === -1) {
                      addresses.push(address);
                    }
                    else {
                      tags.forEach(function(thisArg){
                        addresses[search].tags.push(thisArg);
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }
      //Save the addresses to the person
      json[index].addresses = addresses;

      //Formats invisible
      if (result[i].invisible == 0 || result[i].invisible == 'no' || result[i].invisible == false) {
        json[index].invisible = false;
      } else if (result[i].invisible == 1 || result[i].invisible == 'yes' || result[i].invisible == true) {
        json[index].invisible = true;
      }
      if (result[i].invisible == '') {
        delete json[index].invisible;
      }
      //Formats see_all
      if (result[i].see_all == 0 || result[i].see_all == 'no' || result[i].see_all == false) {
        json[index].see_all = false;
      } else if (result[i].see_all == 1 || result[i].see_all == 'yes' || result[i].see_all == true) {
        json[index].see_all = true;
      }
      if (result[i].see_all == '') {
        delete json[index].see_all;
      }
    }
  }
  console.log(JSON.stringify(json)); //JSON

}

/***** FUNCTIONS *****/

/*
 *searchPerson - search a person with name @fullname and eid @eid in the @json
 *Returns the index of the person in the json, or -1 if there isn't a person
 *with this infos.
 */
function searchPerson(json, fullname, eid) {
  for (var i = 0; i < json.length; i++) {
    if (json[i].fullname == fullname && json[i].eid == eid) {
      return i;
    }
  }
  return -1;
}

/*
 *searchAddress - search an address @address in an @addresses array
 *Returns the index of the address in the array, or -1 if there isn't.
 */
function searchAddress(addresses, address) {
  for (var i = 0; i < addresses.length; i++) {
    if (addresses[i].address === address){
      return i;
    }
  }
  return -1;
}
