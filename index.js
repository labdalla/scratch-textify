// Meta script for spawning processes that will textify batches of projects at a time.
// Each batch would be BATCH_SIZE projects.

const process = require('child_process');
const graceful_fs = require("graceful-fs");
const csv = require("fast-csv");
const fs = require("fs");


// TODO: change NUM_BATCHES back to 600 when done testing!
// const NUM_BATCHES = 3
const NUM_BATCHES = 800
const BATCH_SIZE = 1000
const MASTER_LOG = "data/master.log"


const MASTER_PROJECT_IDS_CSV = "ids/project_ids.csv"
const MASTER_PROJECT_IDS = []


var timeout = false

var stream = fs.createReadStream(MASTER_PROJECT_IDS_CSV)
var csvStream = csv.parse()
  .on("data", function(data) {
    if (data[0] != "id") {
      MASTER_PROJECT_IDS.push(data[0])
    }

  })
  .on("end", function() {
    console.log("done constructing the master list of the project ids")
    console.log("Size of PROJECT_IDS: ", MASTER_PROJECT_IDS.length)

    textifyDataset(1);

  });

  stream.pipe(csvStream)






/**
* Textifies the entire dataset in batches of BATCH_SIZE projects at a time. Expects the current batch to be passed in as input
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
  if (batch_index === (NUM_BATCHES + 1)) {
    clearTimeout(timer);
    return
  }

  // calculate the current batch index range
  low = (batch_index - 1)*BATCH_SIZE
  high = batch_index*BATCH_SIZE - 1 // e.g. 3999
  current_batch = low.toString() + "-" + high.toString()

  console.log("current_batch: ", current_batch);

  // create the corresponding project ids csv file for the current batch
  current_project_ids = MASTER_PROJECT_IDS.slice(low, (high+1))
  console.log("current_project_ids length: ", current_project_ids.length)
  current_project_ids = current_project_ids.toString() // pass in a string of sequence of project ids


  var next_batch_index = batch_index + 1

  var path = "parse_projects.js"
  var filepath_shorthand = "data/" + current_batch
  var args = ["--project_ids_list", current_project_ids,
              "--textified_projects", filepath_shorthand,
              "--textified_ids", filepath_shorthand,
              "--errors", filepath_shorthand]

  // Otherwise, fork a new process and wait for it to exit before moving on to the next batch
  var forked_process = process.fork(path, args);


  forked_process.on('exit', (code) => {
    console.log('child process exited with code ', code);

    // Code = 0 means successful exiting
    if (code === 0) {
      // log success
      success = "***** SUCCESS ***** " + current_batch + "\n"
      console.log("ABOUT TO APPEND SUCCESS TO MASTER LOG!")
      graceful_fs.appendFile(MASTER_LOG, success, function(err) {
        console.log("successfully appended to master log! Going to return now.");
        clearTimeout(timer);

        // recursive step
        return textifyDataset(next_batch_index);
      });
    }

    // Code != 0 means error
    else if ((code !== 0)) {

      if (timeout) {
        timeout = false
        clearTimeout(timer);

        // recursive step
        return textifyDataset(next_batch_index);
      }

      else {
        console.log("batch " + current_batch + ' had some error (not a timeout)!');
        // log error
        error = "***** ERROR ***** " + current_batch + "\n"
        graceful_fs.appendFile(MASTER_LOG, error, function(err) {
          clearTimeout(timer);

          // recursive step
          return textifyDataset(next_batch_index);
        });
      }

    }
  });


  // Watchdog timer for 30 mins
  var timer = setTimeout(function() {
    console.log('batch ' + current_batch + ' timed out!');
    timeout = true;

    // log timeout
    timeout = "***** TIMEOUT ***** " + current_batch + "\n"
    graceful_fs.appendFile(MASTER_LOG, timeout, function(err) {
      // kill process after logging the timeout
      forked_process.kill();

    });
  }, 1800000);

}
