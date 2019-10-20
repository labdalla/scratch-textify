# scratch-textify
Create text-based versions of Scratch projects (following a specific syntax).

## About:
Script for parsing Scratch projects, and encoding them as sequences of blocks,
with special symbols to denote certain transitions and relations between the blocks.
This is a relatively "flat" view of the blocks, where the blocks are traversed in order,
from top to bottom.
    
## Instructions
- To parse a single project, run the following command from your terminal:
  
      $ node parse_projects.js --project_id <desired_project_id>


- To parse a list of projects at once, do the following:
  - add a csv file containing a list of project ids to the top level /scratch-textify directory.
  - add the name of that csv as a command line argument and run the following command:
        
        $ node parse_projects.js --project_ids_csv <csv_filename>


- If you'd like to change the output file where the parse results are written, add the following command line argument:
  
      $ node parse_projects.js --output_path <path_to_output_file>
