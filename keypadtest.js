 var tessel = require('tessel')
    , Keypad = require('./index2')
    , gpio = tessel.port.A.pin; //shortcut for referencing Tessel pins

  var keypad = new Keypad({
    keys: [
      ['1', '2', '3', 'A'],
      ['4', '5', '6', 'B'],
      ['7', '8', '9', 'C'],
      ['*', '0', '#', 'D']]
  , rows: [gpio[0], gpio[1], gpio[2], gpio[3]]
  , cols: [gpio[4], gpio[5], gpio[6], gpio[7]]
  , scan: 'both' // 'col' or 'both'
  , poll: 100 // number sets for auto polling (integer)
  });

  keypad.on('change', function(key, val){
    //console.log("Changed");
  });

  keypad.on('keydown', function(key){
    console.log("Keydown " + key);
  });

  keypad.on('keyup', function(key){
    //console.log("Keyup");
  });