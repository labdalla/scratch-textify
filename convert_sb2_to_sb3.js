/*
ABOUT:
    Script for converting sb2 files (i.e. Scratch 2 projects) into sb3 files (i.e. Scratch 3 projects).
    Written by: Karishma Chadha, Lena Abdalla
*/

const VM = require('scratch-vm');
const STORAGE = require('scratch-storage');
const PROJECT_SERVER = "https://cdn.projects.scratch.mit.edu/";
const ASSET_SERVER = "https://cdn.assets.scratch.mit.edu/";

const getProjectUrl = function (asset) {
    const assetIdParts = asset.assetId.split('.');
    const assetUrlParts = [PROJECT_SERVER, 'internalapi/project/', assetIdParts[0], '/get/'];
    if (assetIdParts[1]) {
        assetUrlParts.push(assetIdParts[1]);
    }
    return assetUrlParts.join('');
};

const getAssetUrl = function (asset) {
    const assetUrlParts = [
        ASSET_SERVER,
        'internalapi/asset/',
        asset.assetId,
        '.',
        asset.dataFormat,
        '/get/'
    ];
    return assetUrlParts.join('');
};

/**
 * To convert from sb2 to sb3.
 * @param  {string} project_id    the project_id corresponding to the Scratch 2 project to be converted.
 * @return {Promise.<object>}     promise for an sb3 json file.
 */
const convert = function(project_id) {
  const vm = new VM();
  const storage1 = new STORAGE();
  storage1.addWebSource([storage1.AssetType.Project], getProjectUrl);
  storage1.addWebSource([storage1.AssetType.ImageVector, storage1.AssetType.ImageBitmap, storage1.AssetType.Sound], getAssetUrl);
  vm.attachStorage(storage1);
  const storage = vm.runtime.storage;

  // TODO: check with Karishma whether what I wrote here for Promise is a correct use of promises and makes sense.
  return new Promise((resolve, reject) => {
      storage.load(storage.AssetType.Project, project_id) // load project from project server (e.g. projects.scratch.mit.edu)
      .then(projectAsset => {
          return vm.loadProject(projectAsset.data);
        }, (err) => {
          reject(Error("couldn't load project from projects server projects.scratch.mit.edu."))
        })
      .then(() => {
          const project_json = vm.toJSON(); // only one project ever that's loaded to the VM; VM is the brain of the editor, only responsible for current project that's loaded into the editor
        // console.log(project_json);
        // return project_json;
          resolve(project_json);
        }, (err) => {
          reject(Error("couldn't load project into vm."))
        })
    }
  )


};

module.exports = convert;

// convert("337467560");
// convert("12758695");
