// Meta script for spawning processes that will textify batches of projects at a time.
// Each batch would be 1000 projects.

const process = require('child_process');
const graceful_fs = require("graceful-fs");

// TODO: change NUM_BATCHES back to 600 when done testing!
const NUM_BATCHES = 10
// const NUM_BATCHES = 600
const MASTER_LOG = "data/master.log"


const MASTER_PROJECT_IDS_CSV = "data/project_ids.csv"
const MASTER_PROJECT_IDS = []


var stream = fs.createReadStream(MASTER_PROJECT_IDS_CSV)
var csvStream = csv.parse()
  .on("data", function(data) {
    if (data[0] != "id") {
      MASTER_PROJECT_IDS.push(data[0])
    }

  })
  .on("end", function() {
    console.log("done constructing the list of the project ids")
    console.log("Size of PROJECT_IDS: ", MASTER_PROJECT_IDS.length)

    textifyDataset (1);



  });

  stream.pipe(csvStream)






/**
* Textifies the entire dataset in batches of 1000 projects at a time. Expects the current batch to be passed in as input
* Forks a process for each batch; waits for that process to either exit cleanly or with an error or times out.
* For each batch, the following files are written out to disk: <dataset-indices>.txt representing the textified project,
*                 <error>.err representing any project ids that had errors or other errors,
*                 and <textified_project_ids>.txt representing a list of the project ids that were successfully textified.
* Defined recursively until the the last batch is reached.
*
* @param {string} path to csv file containing batch of project ids.
* @param {int} batch_index the index of the current batch we are processing. e.g if num_batch = 4, then we are processing the fourth batch, which corresponds to indices 3000-3999

* @return {void}
**/
function textifyDataset (batch_index) {

  console.log("batch_index: ", batch_index);

  // base case:  no more batches to textify, since we got to the 600th batch
  if (batch_index === NUM_BATCHES) {
    return
  }

  // calculate the current batch index range
  low = (batch_index - 1)*1000
  high = batch_index*1000 - 1 // e.g. 3999
  current_batch = low.toString() + "-" + high.toString()

  console.log("current_batch: ", current_batch);

  // create the corresponding project ids csv file for the current batch
  current_project_ids = MASTER_PROJECT_IDS.slice(low, (high+1))
  // TODO: find out if you can have a list of project ids as a command line argument to parse_projects.js

  // setup the command line arguments
  var project_ids_arg = "--project_ids project_ids_" + current_batch
  var textified_projects_arg = "--textified_projects " + current_batch // TODO: add such a command line argument to parse_projects.js script!
  var textified_ids_arg = "--textified_ids " + current_batch // TODO: add such a command line argument to parse_projects.js script!
  var errors_arg = "--errors " + current_batch// TODO: add such a command line argument to parse_projects.js script!


  var next_batch_index = batch_index + 1

  // Otherwise, fork a new process and wait for it to exit before moving on to the next batch
  var forked_process = process.fork("parse_projects.js", [project_ids_arg, textified_projects_arg, textified_ids_arg, errors_arg]);


  forked_process.on('exit', (code) => {
    console.log('child process exited with code ${code}');

    // Code = 0 means successful exiting
    if (code === 0) {
      // log success
      success = "***** SUCCESS ***** " + current_batch + "\n"
      graceful_fs.appendFile(MASTER_LOG, success, function(err) {
        // recursive step
        textifyDataset(next_batch_index);
      });
    }

    // Code != 0 means error
    else if (code !== 0) {
      // log error
      error = "***** ERROR ***** " + current_batch + "\n"
      graceful_fs.appendFile(MASTER_LOG, error, function(err) {
        // recursive step
        textifyDataset(next_batch_index);
      });
    }
  });


  forked_process.on('close', (code, signal) => {
    console.log('child process terminated due to receiving signal ${signal}');

    // recursive step
    textifyDataset(next_batch_index);
  });


  // Watchdog timer for 10 mins
  setTimeout(function() {
    console.log('batch ' + current_batch + ' timed out!');

    // log timeout
    timeout = "***** TIMEOUT ***** " + current_batch + "\n"
    graceful_fs.appendFile(MASTER_LOG, timeout, function(err) {
      // kill process after logging the timeout
      forked_process.kill('SIGHUP');
    });
  }, 600000)

}
