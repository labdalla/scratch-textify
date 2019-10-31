// Meta script for spawning processes that will textify batches of projects at a time.
// Each batch would be 1000 projects.

const process = require('child_process');

var num_batches = 600

/**
* Textifies the entire dataset in batches of 1000 projects at a time. Expects the current batch to be passed in as input
* Forks a process for each batch; waits for that process to either exit cleanly or with an error or times out.
* For each batch, the following files are written out to disk: <dataset-indices>.txt representing the textified project,
*                 <error>.err representing any project ids that had errors or other errors,
*                 and <textified_project_ids>.txt representing a list of the project ids that were successfully textified.
* Defined recursively until the the last batch is reached.
*
* @param {string} path to csv file containing batch of project ids.
* @return {void}
**/
function textifyDataset (path, current_batch) {

  // base case:  no more batches to textify
  if (num_batches === 0) {
    return
  }


  // modify the global variable to account for having handled the current batch
  num_batches -= 1
  // TODO: calculate current_batch here accordingly to get passed in to next recursive function
  
}

/**
* Fork a new process to textify the given project ids.
*
* @param {string} path to csv file containing batch of  project ids
**/
function fork (path, current_batch) {
  // TODO: current_batch should be a string denoting the index range of projects we are considering (e.g 0-1000 for the first batch)


  var csv_arg = "--project_ids_csv " + current_batch + ".csv"
  var dataset_arg = "--dataset_filepath" + current_batch + "_dataset.txt"// TODO: add such a command line argument to parse_projects.js script!
  var project_ids_arg = "--textified_ids_filepath" + current_batch + "_textified_ids.txt" // TODO: add such a command line argument to parse_projects.js script!
  var error_arg = "--error_filepath " + current_batch + "_errors.txt"// TODO: add such a command line argument to parse_projects.js script!

  var forked_process = process.fork("parse_projects.js", [csv_arg, dataset_arg, project_ids_arg, error_arg]);

  // listen to different events from forked_process
}
