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

// TODO: Iterate through sb2 projects in your dataset and convert them to sb3 projects.
//      Or better yet, move this script or call it in the parse_projects.js file and do the conversion there if you get projectVersion == 2.
const convert = function(project_id) {
  const vm = new VM();
  const storage1 = new STORAGE();
  storage1.addWebSource([storage1.AssetType.Project], getProjectUrl);
  storage1.addWebSource([storage1.AssetType.ImageVector, storage1.AssetType.ImageBitmap, storage1.AssetType.Sound], getAssetUrl);
  vm.attachStorage(storage1);
  const storage = vm.runtime.storage;
  storage.load(storage.AssetType.Project, project_id) // load project from project server (e.g. projects.scratch.mit.edu)
    .then(projectAsset => {
      return vm.loadProject(projectAsset.data)
    })
    .then(() => {
      const project_json = vm.toJSON(); // only one project ever that's loaded to the VM; VM is the brain of the editor, only responsible for current project that's loaded into the editor
      console.log(project_json);
    })

}

// module.exports = convert;

convert("337467560");
