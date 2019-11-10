const _ = require('lodash');
const fs = require('fs');
const parse = require('./parse_projects_pool.js');
const path = require('path');
const workerpool = require('workerpool');

// Settings and Configuration
const BATCH_SIZE = 1000

// Get all projects and split into batches
const project_uri = path.resolve(__dirname, 'ids/project_ids_last_496001_ids.csv');
const projects = fs.readFileSync(project_uri, 'utf8').split('\n');
const batch_list = _.chunk(projects, BATCH_SIZE);


const pool = workerpool.pool({
  maxWorkers: 10,
  maxQueueSize: 1024
});

for (let i in batch_list) {
    var filename = "batch_" + i.toString()
    pool.exec(parse, [batch_list[i], filename])
        .then(function (result) {
          console.log('result', result);
        })
        .catch(function (err) {
          console.error(err);
        })
        .then(function () {
          pool.terminate(); // terminate all workers when done
        });
}
