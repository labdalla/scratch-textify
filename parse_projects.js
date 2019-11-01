/*
ABOUT:
    Script for parsing Scratch projects, and encoding them as sequences of blocks,
    with special symbols to denote certain transitions and relations between the blocks.
    This is a relatively "flat" view of the blocks, where the blocks are traversed in order,
    from top to bottom.

SOURCES:
    - https://www.npmjs.com/package/curl-request
    - parser function used below was provided from the scratch-parser node module (written and provided by Scratch Team)

INSTRUCTIONS:
    To parse a single project, run the following command from your terminal:
      $ node parse_projects.js --project_id <desired_project_id>

    To parse a list of projects at once, do the following:
      - add a csv file containing a list of project ids to the top level /scratch-textify directory.
      - add the name of that csv as a command line argument and run the following command:
          $ node parse_projects.js --project_ids_csv <csv_filename>

    If you'd like to change the output file where the parse results are written, add the following command line argument:
      $ node parse_projects.js --output_path <path_to_output_file>

    Defaults:
      project ids csv: partial_project_ids.csv (a list of 29 project ids)
      output path: data/dataset.txt (contains all the parsed projects in that file.)

OUTPUT:
    Depending on whether you set the output file path, the output text will either be found in data/dataset.txt (default) or in the user-defined output path.

*/



const curl = new (require('curl-request'))();
const argv = require('yargs').argv;
const csv = require("fast-csv");
const fs = require("fs");
const graceful_fs = require("graceful-fs");
const async = require('async');
const parser = require("scratch-parser");
const convert = require('./convert_sb2_to_sb3.js');
// const timeout_promise = require('./timeout-promise.js')


// ===================================================== LEGEND / MAPPING ==============================================================
/*  Below is a legend explaining the mapping between the symbol and the type of transition it represents.
    This object is presented for informational reasons only; it doesn't get used anywhere in this file.
*/

var legend = {
  " _STARTSTACK_ ": "beginning of new stack",
  " _ENDSTACK_ ": "end of new stack",
  " _STARTNEST_ ": "beginning of nesting",
  " _ENDNEST_ ": "end of nesting",
  " _STARTINPUT_ ": "beginning of input",
  " _ENDINPUT_ ": "end of input",
  " numtext_input ": "number or text input",
  " _VAR_ ": "variable",
  " _LIST_ ": "list",
  " menu_option ": "chosen menu option",
  " _MENU_ ": "dropdown menu",
  " _NUMTEXTARG_ ": "number or text argument", // only used with procedures_definition block
  " _BOOLARG_ ": "boolean argument", // only used with procedures_definition block
  " procedures_definition ": "custom procedure definition", // will be used whenever a new custom procedure is defined.
  " procedures_call ": "custom procedure call", // will be used whenever a custom procedure is called.
  " _NEXT_ ": "next" // meaning, blocks are ordered in the string and separated by this symbol
}

// This list is for informational purposes only, in case you want inspiration for example Scratch projects to test script with.
var example_test_projects = [286136792, 303772729, 10128407]



// ===================================================== SCRIPT ==============================================================

const HAT_BLOCKS = [  "event_whenflagclicked",
                      "event_whenkeypressed",
                      "event_whenthisspriteclicked",
                      "event_whenbackdropswitchesto",
                      "event_whengreaterthan",
                      "event_whenbroadcastreceived",
                      "control_start_as_clone",
                      "videoSensing_whenMotionGreaterThan",
                      "makeymakey_whenMakeyKeyPressed",
                      "makeymakey_whenCodePressed",
                      "microbit_whenButtonPressed",
                      "microbit_whenGesture",
                      "microbit_whenTilted",
                      "microbit_whenPinConnected",
                      "ev3_whenButtonPressed",
                      "ev3_whenDistanceLessThan",
                      "ev3_whenBrightnessLessThan",
                      "boost_whenColor",
                      "boost_whenTilted",
                      "wedo2_whenDistance",
                      "wedo2_whenTilted",
                      "gdxfor_whenGesture",
                      "gdxfor_whenForcePushedOrPulled",
                      "gdxfor_whenTilted" ]

const NO_INPUT_BLOCKS = [ "motion_xposition",
                          "motion_yposition",
                          "motion_direction",
                          "looks_costumenumbername",
                          "looks_backdropnumbername",
                          "looks_size",
                          "sound_volume",
                          "sensing_answer",
                          "sensing_mousex",
                          "sensing_mousey",
                          "sensing_loudness",
                          "sensing_timer",
                          "sensing_dayssince2000",
                          "sensing_username",
                          "sensing_current" ]

const MENUS = [ "looks_backdrops",
                "looks_costume",
                "sensing_touchingobjectmenu",
                "sensing_distancetomenu",
                "sensing_keyoptions"]

const EXCEPTIONS = [ "note" ]

var PROJECT_IDS = []

var ERRORS = ""

// const ERRORS_TEXT_FILE = "errors.txt"


// Read in the appropriate csv file and construct the list of project ids.
// Then, open a text file to write the sequences of blocks to it.
var csv_file;
if (argv.project_ids) {
  csv_file = argv.project_ids + ".csv"
}
else {
  csv_file = "all_project_ids.csv"
}

var text_file;
if (argv.textified_projects) {
  text_file = argv.textified_projects + ".txt"
}
else {
  text_file = "data/textified_projects.txt"
}

// this text file contains the ids of all the projects that were successfully textified and written to the output text file.
var ids_file;
if (argv.textified_ids) {
  ids_file = argv.textified_ids + ".ids"
}
else {
  ids_file = "data/textified_ids.ids"
}

var errors_file;
if (argv.errors) {
  ids_file = argv.errors + ".err"
}
else {
  ids_file = "data/errors.err"
}


console.log("csv_file: ", csv_file)
console.log("text_file: ", text_file)

var stream = fs.createReadStream(csv_file)
var csvStream = csv.parse()
  .on("data", function(data) {
    if (data[0] != "id") {
      PROJECT_IDS.push(data[0])
    }

  })
  .on("end", function() {
    console.log("done constructing the list of the project ids")

    console.log("Size of PROJECT_IDS: ", PROJECT_IDS.length)
    if (argv.project_id) {
      q.push([argv.project_id]);
    }

    else {
      q.push(PROJECT_IDS);
    }

    // graceful_fs.open(text_file, "w", function(err, file) {
    //   if (err) throw err
    //
    //
    // });



  });

  stream.pipe(csvStream)



// =============================================== HELPER FUNCTIONS ===============================================================


const task = function(project_id, callback) {
  console.log("PROJECT_ID: ", project_id)
  async.waterfall([
    // dummy function that passes on the project_id into the convertProject function;
    // seems to be the best way to do this.
    function(callback) {
      callback(null, project_id);
    },
    convertProject,
    parseProject,
    textifyProject,
    writeResults
  ], function (err, result) {
    // log the ERRORS string to record faulty projects
    logErrors(ERRORS)
    .then(status => {
      // result is project_id
      console.log("======= done with ", result);
      // overwrite the global ERRORS string to be empty again
      ERRORS = "";
      callback();
    })
    .catch((err) => {
      throw err;
    })


  });
}


const q = async.queue(task, 1);


q.drain(function() {
  // when everything is done,
  // log all the project ids that had associated errors
  logErrors(ERRORS);
  console.log("========= EVERYTHING IS DONE!")
});

// print out the status of the queue workers list every second.
setInterval(function () {
  console.log("************** QUEUE INFORMATION **************");
  console.dir(q.length());
  console.dir(q.running());
  console.dir(q.workersList());
}, 1000);


function convertProject(project_id, callback) {
    console.log("PROJECT_ID: ", project_id)
    convert(project_id.toString())
    .then((result) => {
      callback(null, result, project_id);
    })
    .catch((err) => {
      ERRORS += project_id + "\n"
      callback(err); // stops the waterfall
    });
}

function parseProject(body, project_id, callback) {
    // Parse the converted project
    parser(body, false, (err, results) => {
      if (err) {
        ERRORS += project_id + "\n"
        callback(err);
      }

      else {
        project = results[0]
        project_version = project.projectVersion
        callback(null, project, project_id);
      }
    });
}


function textifyProject(project, project_id, callback) {
    var blocks_text = ""

    // TODO: remove this line in final version of the script.
    // blocks_text += "\n\n ############ Project " + project_id.toString() + " ############ \n\n"

    project.targets.forEach((entity) => {
      // entity is either a stage or a sprite

      // TODO: remove this once you're done debugging your script!
      // blocks_text += "\n\n ============ " + entity.name + " ============ \n\n"

      var block_ids = Object.keys(entity.blocks)

      block_ids.forEach((block_id) => {
        // a block can only be a topLevel for one stack of blocks / code
        // but each sprite or stage might have more than one stack of blocks
        // and therefore, more than one block with topLevel attribute set to true

        // Thus, we can iterate through all the blocks in a sprite (by iterating through their ids),
        // and only look at those blocks that are at the topLevel.
        // If they are, we then begin traversing the path down to the end of the stack,
        // and add each block we see, using the rules and symbols defined in the legend above,
        // until we get to the end of that stack.
        // The next time we see a block with topLevel = true, it will be representing a different stack of blocks.
        var block_object = entity.blocks[block_id]
        // Look for blocks that are topLevel, and *not* shadow blocks (bug), and are either hat blocks (i.e. don't traverse stacks that aren't headed by a hat block), or are procedure definition blocks
        // if ((block_object.topLevel) && (!block_object.shadow)) {
        if ((block_object.topLevel) && (!block_object.shadow) && (HAT_BLOCKS.includes(block_object.opcode) || (block_object.opcode === "procedures_definition")) ) {
          // Start traversing this stack till the end
          // Each time, get the opcode (i.e. name) of the current block
          // Add the { symbol representing a new stack starting
          blocks_text += " _STARTSTACK_ "
          blocks_string = traverse(entity.blocks, block_object)
          blocks_text += blocks_string
          blocks_text += " _ENDSTACK_ "

        }
      });

    });

    // console.log("stuck inside textifyProject");

    // Add the sequence that represents the current project to the text file and start a new line for the next project
    // Remove extraneous whitespace
    // TODO: uncomment back the line below to remove whitespace (once you're done testing your code)
    blocks_text = blocks_text.replace(/\s+/g,' ').trim()
    // project_text = blocks_text + "\n"
    project_text = blocks_text
    callback(null, project_text, project_id);
}


function writeResults(project_text, project_id, callback) {
  if (project_text.length === 0) {
    callback(null, project_id); // complete the waterfall
    return;
  }
    // console.log("stuck inside writeProject");

    graceful_fs.appendFile(text_file, project_text + "\n", function(err) {
      // if (err) return callback(err);
      if (err) callback(err);
      // write project id to another file to keep track
      graceful_fs.appendFile(ids_file, project_id + "\n", function(err) {
        if (err) callback(err);
        callback(null, project_id); // complete the waterfall
      });


    });
}

function logErrors(errors) {
  return new Promise((resolve, reject) => {
    if (ERRORS.length === 0) {
      // don't write anything to the file
      resolve("success");
      return;
    }
    graceful_fs.appendFile(errors_file, errors, function(err) {
      if (err) {
        reject(Error(err));
        return;
      }
      resolve("success");
    });
  });

}


/**
* Helper function to traverse a given stack of blocks for a given entity.
* Defined recursively so that it can also traverse inputs, substacks, etc
* @param {json} all_blocks_json the JSON object corresponding to the blocks of current entity (where entity is a sprite or the stage).
* @param {json} current_block_json   the specific JSON object corresponding to the block to start from in the current context
* @return {string} blocks_string  a string containing all blocks after traversing the entire stack.
*/

function traverse(all_blocks_json, current_block_json) {

  // blocks_string will be the string that we keep updating with the blocks traversed.
  // At the end, it will contain all blocks seen when this stack was traversed.
  var blocks_string = ""
  var current_block_opcode = current_block_json.opcode

  // NOTE: here are multiple cases (that are not necessarily mutually exclusive); either:
  //    1. we are currently at a procedure definition block
  //    2. we are currently at a procedures prototype opcode (which always referenced by a procedures definition block)
  //    3. we are currently at a argument_reporter block
  //    4. we are currently at a procedure call block
  //    5. we are currently at a block that has a dropdown menu
  //    6. we are currently at a block that takes no inputs,
  //       and itself can be inserted as an input (i.e. has an oval shape).
  //    7. we are currently at a block that can take inputs
  //    8. we are currently at a block that can be nested


  // ********************************** CASE 1: Procedure Definition **********************************

  if (current_block_opcode === "procedures_definition") {
    // Be sure to:
    //    - Add the "procedures_definition" as opcode to the blocks_string
    //    - If there are any arguments to the procedure, add them as generic _NUMTEXTARG_ or _BOOLARG_ in blocks_string

    blocks_string += "procedures_definition "

    // 1a. HANDLE ARGUMENTS
    var procedures_prototype_id = current_block_json.inputs.custom_block[1]
    var procedures_prototype_json = all_blocks_json[procedures_prototype_id]
    procedure_string = traverse(all_blocks_json, procedures_prototype_json)
    blocks_string += procedure_string

    // Since you're in the procedures_definition context, you only want to check if there's a next block to traverse.
    // None of the cases below (the ones outside this if condition) will ever apply *to the current procedures_definition block*
    // so we can return right after getting the return string from the next block.
    var next_block_id = current_block_json.next

    // If this block has no next block (i.e. next_block_id == null), then this is the base case and we return.
    if (next_block_id == null) {
      return blocks_string
    }

    blocks_string += " _NEXT_ "

    // Otherwise, if there is a next block, we get the json corresponding to it and make a recursive call [RECURSIVE STEP].
    var next_block_json = all_blocks_json[next_block_id]
    next_block_string = traverse(all_blocks_json, next_block_json)

    blocks_string += next_block_string
    return blocks_string
  }


  // ********************************** CASE 2: Procedures Prototype (always referenced by a procedures definition) **********************************

  else if (current_block_opcode === "procedures_prototype") {
    // get the keys of the inputs field. Each key corresponds to an argument for the custom procedure
    var keys = Object.keys(current_block_json.inputs)
    keys.forEach(function(key) {
      var argument_id = current_block_json.inputs[key][1]
      var argument_json = all_blocks_json[argument_id]
      argument_string = traverse(all_blocks_json, argument_json)
      blocks_string += argument_string

    })

    return blocks_string
  }


  // ********************************** CASE 3: Argument_reporter Block **********************************

  // In this case, the opcode would be either: 'argument_reporter_boolean' or 'argument_reporter_string_number'
  // so we perform a split the opcode on _ and get the last element in the list
  // so as to differentiate between boolean and num_string argumnet type
  else if ((current_block_opcode === "argument_reporter_string_number") ||
      (current_block_opcode === "argument_reporter_boolean")) {
          var split = current_block_opcode.split("_")
          if (split.includes("string") && split.includes("number")) {
            blocks_string += " _NUMTEXTARG_ "
          }

          else if (split.includes("boolean")) {
            blocks_string += " _BOOLARG_ "
          }

          return blocks_string
  }


  // ********************************** CASE 4: Procedure Call **********************************

  else if (current_block_opcode === "procedures_call") {
    // Be sure to:
    //    - Add the "procedures_call" as opcode to the blocks_string
    //    - If the procedure takes in any arguments / input,
    //      add them as inputs (_STARTINPUT_ numtext_input _ENDINPUT_)
    //      or as booleans (corresponding boolean diamond shaped block that is used)
    //      in blocks_string.

    blocks_string += "procedures_call "

    // 2a. HANDLE ARGUMENTS / INPUTS
    // Note that this is the same case as numtext_input or any block being inserted as input into another block
    // so we can just have the check once that generally checks whether the current block has inputs or not.
  }

  // ALL OTHER CASES: Just add the opcode of the current block
  // If it's a shadow block, then don't add the opcode.
  else if (!current_block_json.shadow) {
    blocks_string += current_block_opcode + " "
  }


  // ********************************** CASE 5: Block has dropdown menu **********************************

  // Either - the block has the substring "_menu" in the opcode
  //        - or it is one of the blocks in the MENUS list
  //        - or its "fields" attribute is not empty:
  //              - in this case, it might specifically have a VARIABLE dropdown
  // EXCEPTIONS includes blocks that should be treated as menued blocks, even though their fields attributes are non-empty.
  if (current_block_opcode.includes("_menu") ||
     (MENUS.includes(current_block_opcode)) ||
     ( (Object.keys(current_block_json.fields).length !== 0) && (!EXCEPTIONS.includes(current_block_opcode)) ) ) {

        // If the block specifically has a VARIABLE dropdown, then add the variable keyword
        if (current_block_json.fields.VARIABLE) {
          blocks_string += " _MENU_ "
          blocks_string += "_VAR_"
          blocks_string += " _MENU_ "
        }

        // If the block specifically has a LIST dropdown, then add the list keyword
        else if (current_block_json.fields.LIST) {
          blocks_string += " _MENU_ "
          blocks_string += "_LIST_"
          blocks_string += " _MENU_ "
        }

        // Otherwise, it's a generic menu_option
        else {
          blocks_string += " _MENU_ "
          blocks_string += "menu_option"
          blocks_string += " _MENU_ "
        }

  }

  // [SPECIAL CASE] If block is in EXCEPTIONS (and its fields attribute is non-empty), then we have to extract its numtext_input from its fields attribute (instead of from its inputs attribute as usual)
  if ((EXCEPTIONS.includes(current_block_opcode)) && (Object.keys(current_block_json.fields).length !== 0)) {
    keys = Object.keys(current_block_json.fields)
    keys.forEach(function(key) {
        // Add a numtext_input for each distinct key.
        // Trying to make these steps generic but not sure if it will actually help with any future instances of this.
        blocks_string += "numtext_input"
    })
  }


  // ********************************** CASE 6: Block that takes no inputs and is itself an input block. **********************************

  // [BASE CASE] because there can be no other block inserted, nested or coming after such a block,
  //              so we return.
  if (NO_INPUT_BLOCKS.includes(current_block_opcode)) {
    return blocks_string
  }


  // ********************************** CASE 7: Block that can take inputs **********************************

  if (Object.keys(current_block_json.inputs).length !== 0) {
    keys = Object.keys(current_block_json.inputs)

    keys.forEach(function(key) {
      // Any other key besides SUBSTACK and SUBSTACK2 (those are checked later on).
      if ((key !== "SUBSTACK") && (key !== "SUBSTACK2")) {
        input_type = current_block_json.inputs[key][1] // this is either an array (referring to textual input) or a string (referring to id of another block)
        var input_string = ""

        // Case 7a: Input is numtext or a variable oval block
        // If input_type is an array, then there are two cases:
        //    - either it's the case of having a variable oval block inserted in the current block's input slot
        //    - or it's the case of having a regular numtext_input
        if (Array.isArray(input_type)) {
          // SPECIAL CASE
          // BROADCAST_INPUT is a special case since the menu isn't encoded into the fields attribute
          // but is instead, in the inputs attribute. Moreover, it's a list (instead of a string referring to another block, which is the menu options block)
          // So, if input_type is an array (and not a string, referring to an inserted block), and the key is BROADCAST_INPUT,
          // then it is the case of a menu, so manually add that to the string.
          if (key === "BROADCAST_INPUT") {
            blocks_string += " _MENU_ "
            blocks_string += "menu_option"
            blocks_string += " _MENU_ "
          }

          else {
            // Case 1: Input is a variable.
            if (input_type[0] === 12) {
              input_string = " _VAR_ "
            }

            // Case 2: Input is a list.
            else if (input_type[0] === 13) {
              input_string = " _LIST_ "
            }

            // Case 3: Input is regular numtext_input
            else {
              // check if the input is the empty string (i.e. no input), in which case, don't add anything to blocks_string
              if (input_type[1] === "") {
                return
              }

              input_string = "numtext_input"
            }

            blocks_string += " _STARTINPUT_ "
            blocks_string += input_string
            blocks_string += " _ENDINPUT_ "
          }

        }

        // Case 7b: Input is a string and refers to the id of another block
        else if (typeof(input_type) === "string") {
          // Find the new block json and make a recursive call. [RECURSIVE STEP]


          inserted_input_block_json = all_blocks_json[input_type]
          var start_input_symbol = ""
          var end_input_symbol = ""

          // Before making the recursive call, check if this "inserted" input block is a shadow block
          // If it is, don't consider it as an input (so no start and end input symbols), but still make a recursive call afterwards since we want to get the menu option out of it.
          // EXCEPTIONS includes blocks that are shadow blocks but in fact, are referring to numtext_input.
          // (So instead of the usual array for a numtext_input, it is getting encoded as a string referring to another block id. That other block is then a shadow block whose fields attribute contains the actual numtext_input)
          if ((!inserted_input_block_json.shadow) || (EXCEPTIONS.includes(inserted_input_block_json.opcode))) {
            start_input_symbol = " _STARTINPUT_ "
            end_input_symbol = " _ENDINPUT_ "

          }

          blocks_string += start_input_symbol
          input_blocks_string = traverse(all_blocks_json, inserted_input_block_json)
          blocks_string += input_blocks_string
          blocks_string += end_input_symbol

        }

      }
    })
  }


  // ********************************** CASE 8: Block can be nested **********************************

  // Check if the current block has SUBSTACK or SUBSTACK2 as keys in the "inputs" json.
  // If it has either of those keys, that means that block in fact has nested blocks inside it (i.e. it's not empty)
  // This means we should recurse. [RECURSIVE STEP]
  // NOTE: Even though we could've just checked for SUBSTACK and SUBSTACK2 above when we were iterating
  // through the blocks and wrote the logic there, by pushing it down here, we are preserving the order
  // since sometimes, CONDITION may come after SUBSTACK and SUBSTACK2 and so the condition block would get
  // added to blocks_string after the substack blocks, which would not make much sense when reading it.
  if (Object.keys(current_block_json.inputs).length !== 0) {
    keys = Object.keys(current_block_json.inputs)
    keys.forEach(function(key) {
      if ((key === "SUBSTACK") || (key === "SUBSTACK2")) {
        nested_block_id = current_block_json.inputs[key][1]
        nested_block_json = all_blocks_json[nested_block_id]
        // For some projects, SUBSTACK or SUBSTACK2 might have null when there are no blocks nested in that part of the if/if_else block
        // as opposed to not having the SUBSTACK / SUBSTACK2 key altogether.
        // TODO: change (and remove) the condition below if above bug gets fixed or there's another way around it.
        if (nested_block_id != null) {
          blocks_string += " _STARTNEST_ "
          nested_block_string = traverse(all_blocks_json, nested_block_json)
          blocks_string += nested_block_string

          blocks_string += " _ENDNEST_ "
        }

      }
    })
  }

  // After you've checked for all the cases, go to the next block (if you can).
  var next_block_id = current_block_json.next

  // If this block has no next block (i.e. next_block_id == null), then this is the base case and we return.
  if (next_block_id == null) {
    return blocks_string
  }

  blocks_string += " _NEXT_ "

  // Otherwise, if there is a next block, we get the json corresponding to it and make a recursive call [RECURSIVE STEP].
  var next_block_json = all_blocks_json[next_block_id]
  next_block_string = traverse(all_blocks_json, next_block_json)

  blocks_string += next_block_string
  return blocks_string

}
