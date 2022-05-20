const path = require('path');
const fs = require('fs');
const { readdir } = require('fs/promises');
const { createReadStream, createWriteStream, rm, access, mkdir, writeFile } = require('fs');

createDistDir();

async function bundleHTML() {
  const template = createReadStream(path.resolve(__dirname, 'template.html'), { encoding: 'utf-8' });
  let mainHtml = '';

  for await (const chunk of template) {
    mainHtml += chunk;
  }
  while (mainHtml.indexOf('{{') !== -1) {
    const start = mainHtml.indexOf('{{');
    const end = mainHtml.indexOf('}}');
    const component = await getComponent(`${mainHtml.slice(start + 2, end)}.html`);
    mainHtml = mainHtml.replace(mainHtml.slice(start - 4, end + 2), component);
  }
  const writeStream = createWriteStream(path.join(__dirname, 'project-dist', 'index.html'), { encoding: 'utf-8' });
  writeStream.write(mainHtml);
}

async function getComponent(compName) {

  const component = createReadStream(path.join(__dirname, 'components', compName));
  let componentStr = '';

  for await (const chunk of component) {
    componentStr += chunk;
  }
  return componentStr;
}

function createDistDir() {
  access(path.join(__dirname, 'project-dist'), (err) => {
    if (err) {
      mkdir(path.join(__dirname, 'project-dist'), (err) => {
        if (err) throw err;
        CopyFiles();
        CompileStyles();
        BundleHTML();
      });
    } else {
      rm(path.join(__dirname, 'project-dist'), { recursive: true }, (err) => {
        if (err) throw err;
        mkdir(path.join(__dirname, 'project-dist'), (err) => {
          if (err) throw err;
          CopyFiles();
          CompileStyles();
          BundleHTML();
        });
      });
    }
  });
}

function CompileStyles() {
  const inputFolder = path.join(__dirname, 'styles');
  const output = path.join(__dirname, 'project-dist');
  let writeStream = createWriteStream(path.resolve(output, 'style.css'));

  const readSyleDir = async (input) => {
    const files = await readdir(input, { withFileTypes: true });
    files.forEach(file => {
      if (file.isFile) {
        const filePath = path.resolve(inputFolder, file.name);
        if (path.extname(filePath) === '.css') {
          const readStream = createReadStream(filePath);
          readStream.pipe(writeStream);
        }
      }
    });
  };
  readSyleDir(inputFolder);
}


function CopyFiles() {
  let fromDir = path.join(__dirname, 'assets');
  let toDir = path.join(__dirname, 'project-dist/assets');
  const createDir = (dir) => {
    fs.mkdir(dir, { recursive: true }, (err) => {
      if (err) throw err;
    });
  };
  const isFolderExist = (dir) => {
    fs.access(dir, (err) => {
      if (err) {
        copyFiles(fromDir, toDir);
      } else {
        rmDir(toDir);
      }
    });
  };
  const rmDir = (dir) => {
    fs.rm(dir, { recursive: true, force: true }, (err) => {
      if (err) throw err;
      copyFiles(fromDir, toDir);
    });
  };
  const copyFiles = (from, to) => {
    createDir(to);
    fs.readdir(from, { withFileTypes: true }, (err, files) => {
      if (err) throw err;
      files.forEach(file => {
        if (file.isFile()) {
          fs.copyFile(path.join(from, file.name), path.join(to, file.name), (err) => { if (err) throw err; });
        } else {
          copyFiles(path.join(from, file.name), path.join(to, file.name));
        }
      });
    });
  };
  isFolderExist(toDir);
}