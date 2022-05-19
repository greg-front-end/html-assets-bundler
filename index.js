const path = require('path');
const fs = require('fs');
const { readdir } = require('fs/promises');
const { createReadStream, createWriteStream, rm, access, mkdir, writeFile } = require('fs');

createDistDir();

function BundleHTML() {
  const streamHtmlTemplate = createReadStream(path.resolve(__dirname, 'template.html'));
  streamHtmlTemplate.on('data', (template) => {
    let htmlTemplate = template.toString();

    fs.readdir(path.join(__dirname, 'components'), { withFileTypes: true }, (err, htmlComponents) => {
      if (err) throw err;
      for (let html of htmlComponents) {
        const streamHtmlComponents = createReadStream(path.join(__dirname, 'components', html.name));
        streamHtmlComponents.on('data', (chunk) => {
          if (htmlTemplate.includes(`{{${html.name.split('.')[0]}}}`)) {
            htmlTemplate = htmlTemplate.replace(`{{${html.name.split('.')[0]}}}`, chunk.toString());
            writeFile(path.join(__dirname, 'project-dist', 'index.html'), htmlTemplate, (err) => {
              if (err) throw err;
            });
          }
        });
      }
    });
  });
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